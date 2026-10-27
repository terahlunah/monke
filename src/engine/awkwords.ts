import {Config, Rule, RulePattern} from "./config.ts"

// Converts Awkwords 1.2 (.awkw) files and patterns into a Monke config.
// Awkwords semantics follow its core.php. Deliberate differences, all reported as warnings where they change output:
// - a character right after a filter (`[VV]^aaC`) is kept (Awkwords' parser skipped it by mistake);
// - a trailing empty option (`a/`) is kept as an empty alternative (Awkwords 1.2 dropped it);
// - brackets inside quotes are read as text everywhere (Awkwords' bracket scan ignored quotes);
// - Awkwords drops the whole word when a filter fires, Monke regenerates the filtered part. Both keep the same words,
//   with the same odds when the filtered part is always generated; inside an alternative or optional the odds differ.

export type AwkwordsWarningCode =
    | "allFiltered" | "cycle" | "undefinedLetter" | "duplicateLetter" | "noName" | "quotedBracket" | "emptyFilter"
    | "trailingEmpty" | "weightClamp" | "rare" | "looseEquality" | "longLine" | "legacy" | "approximateOdds"
    | "ignoredLine" | "noMainPattern"

export type AwkwordsWarning = { code: AwkwordsWarningCode, message: string }

export type AwkwordsImport = {
    config: Config
    // Generator settings stored in .awkw files; undefined when the input was a bare pattern or lacked them.
    wordCount?: number
    filterDuplicates?: boolean
    listOutput?: boolean
    warnings: AwkwordsWarning[]
}

export class AwkwordsError extends Error {
    constructor(message: string, readonly line: number, readonly column: number) {
        super(`${message} (line ${line}, column ${column})`)
    }
}

const ROOT = "Word"
const DEFAULT_LANGUAGE = "Awkwords import"
// Awkwords reads lines with fgets($fh, 255).
const MAX_LINE_BYTES = 254
const RARE_PASS = 0.05
// Output distributions are only computed for warnings; past this size they are skipped.
const MAX_DISTRIBUTION = 20_000

type Frag =
    | { kind: "lit", text: string, filters: string[], src: string }
    | { kind: "ref", letter: string, filters: string[], src: string }
    | { kind: "group" | "opt", alt: Alt, filters: string[], src: string }
type Option = { weight: number, frags: Frag[] }
type Alt = Option[]

type Source = { where: string, text: string, line: number, column: number }

const isCapital = (c: string | undefined) => c !== undefined && c >= "A" && c <= "Z"

// Index just past the quoted span starting at `i` (a `"`); an unclosed quote runs to the end.
const skipQuote = (s: string, i: number): number => {
    const j = s.indexOf('"', i + 1)
    return j < 0 ? s.length : j + 1
}

// Awkwords literal text: spaces dropped, `"..."` copied verbatim, `""` is one double quote.
const literal = (raw: string): string => {
    let out = ""
    let i = 0
    while (i < raw.length) {
        if (raw[i] === '"') {
            const end = skipQuote(raw, i)
            const closed = end <= raw.length && raw[end - 1] === '"' && end - 1 > i
            out += end === i + 2 && closed ? '"' : raw.slice(i + 1, closed ? end - 1 : end)
            i = end
        } else {
            if (raw[i] !== " ") out += raw[i]
            i++
        }
    }
    return out
}

const hasQuotedBracket = (s: string): boolean => {
    for (let i = 0; i < s.length;) {
        if (s[i] === '"') {
            const end = skipQuote(s, i)
            if (/[[\]()]/.test(s.slice(i + 1, end))) return true
            i = end
        } else i++
    }
    return false
}

// Awkwords refuses unbalanced or mismatched brackets, so this is the one import error.
const checkBrackets = (src: Source) => {
    const stack: { ch: string, at: number }[] = []
    const s = src.text
    for (let i = 0; i < s.length;) {
        const c = s[i]
        if (c === '"') {
            i = skipQuote(s, i)
            continue
        }
        const col = src.column + i
        if (c === "[" || c === "(") stack.push({ch: c, at: col})
        if (c === "]" || c === ")") {
            const open = stack.pop()
            if (!open) throw new AwkwordsError(`Unmatched "${c}" in ${src.where}`, src.line, col)
            if ((open.ch === "[") !== (c === "]")) {
                throw new AwkwordsError(`"${c}" in ${src.where} does not close the "${open.ch}" at column ${open.at}`, src.line, col)
            }
        }
        i++
    }
    const open = stack.pop()
    if (open) throw new AwkwordsError(`"${open.ch}" in ${src.where} is never closed`, src.line, open.at)
}

type Warn = (code: AwkwordsWarningCode, message: string) => void

// Mirrors Awkwords' choose(): `/` and `*n` only count outside brackets and quotes; weight digits of an option are
// concatenated wherever they appear in it.
const parseAlt = (s: string, where: string, warn: Warn): Alt => {
    const parts: { text: string, digits: string, stars: string[] }[] = []
    let cur = {text: "", digits: "", stars: [] as string[]}
    let depth = 0
    for (let i = 0; i < s.length;) {
        const c = s[i]
        if (c === '"') {
            const end = skipQuote(s, i)
            cur.text += s.slice(i, end)
            i = end
        } else if (depth === 0 && c === "/") {
            parts.push(cur)
            cur = {text: "", digits: "", stars: []}
            i++
        } else if (depth === 0 && c === "*") {
            let j = i + 1
            while (j < s.length && s[j] >= "0" && s[j] <= "9") j++
            cur.digits += s.slice(i + 1, j)
            cur.stars.push(s.slice(i, j))
            i = j
        } else {
            if (c === "[" || c === "(") depth++
            if (c === "]" || c === ")") depth--
            cur.text += c
            i++
        }
    }
    parts.push(cur)

    if (parts.length > 1 && cur.text === "" && cur.stars.length === 0) {
        warn("trailingEmpty", `In ${where}, the / at the end of ${s} was imported as an empty alternative, so it can generate nothing there. Awkwords 1.2 ignored it; delete the '' pattern in Monke if you did not mean it.`)
    }

    return parts.map(p => {
        let weight = p.digits === "" ? 1 : parseInt(p.digits, 10)
        if (weight < 1) weight = 1
        if (weight > 128) weight = 128
        if (p.stars.length > 1 || (p.digits !== "" && String(weight) !== String(parseInt(p.digits, 10)))) {
            warn("weightClamp", `Weight ${p.stars.join("")} in ${where} was read by Awkwords as ${weight}.`)
        }
        return {weight, frags: parseFrags(p.text, where, warn)}
    })
}

const endOfBracket = (s: string, i: number): number => {
    let depth = 0
    for (let j = i; j < s.length;) {
        const c = s[j]
        if (c === '"') {
            j = skipQuote(s, j)
            continue
        }
        if (c === "[" || c === "(") depth++
        if (c === "]" || c === ")") {
            depth--
            if (depth === 0) return j
        }
        j++
    }
    return s.length
}

const isFragStart = (c: string) => c === "[" || c === "(" || c === "^" || isCapital(c)

// Mirrors Awkwords' fragments(): letters, brackets, filters and literal runs.
const parseFrags = (s: string, where: string, warn: Warn): Frag[] => {
    const frags: Frag[] = []
    for (let i = 0; i < s.length;) {
        const c = s[i]
        if (isCapital(c)) {
            frags.push({kind: "ref", letter: c, filters: [], src: c})
            i++
        } else if (c === "[" || c === "(") {
            const end = endOfBracket(s, i)
            const inner = s.slice(i + 1, end)
            if (hasQuotedBracket(inner)) {
                warn("quotedBracket", `${capitalize(where)} has a quoted bracket inside brackets: ${s.slice(i, end + 1)}. Awkwords did not read it as text there; Monke does. Check the imported rule.`)
            }
            frags.push({kind: c === "[" ? "group" : "opt", alt: parseAlt(inner, where, warn), filters: [], src: s.slice(i, end + 1)})
            i = end + 1
        } else if (c === "^") {
            const start = ++i
            while (i < s.length && !isFragStart(s[i])) i = s[i] === '"' ? skipQuote(s, i) : i + 1
            const raw = s.slice(start, i)
            if (raw.length === 0) {
                warn("emptyFilter", `An empty filter in ${where} was ignored.`)
            } else if (frags.length === 0) {
                warn("emptyFilter", `The filter ^${raw} in ${where} has nothing before it to filter and was ignored, as in Awkwords.`)
            } else {
                frags[frags.length - 1].filters.push(literal(raw))
            }
        } else {
            const start = i
            while (i < s.length && !isFragStart(s[i])) i = s[i] === '"' ? skipQuote(s, i) : i + 1
            const raw = s.slice(start, i)
            const text = literal(raw)
            if (text !== "") frags.push({kind: "lit", text, filters: [], src: raw.trim()})
        }
    }
    return frags
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// --- Reading the file ---

// Pre-1.2 files have no header and HTML entities for characters outside cp1250.
const NAMED_ENTITIES: Record<string, number> = (() => {
    const map: Record<string, number> = {amp: 38, lt: 60, gt: 62, apos: 39}
    "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml"
        .split(" ").forEach((name, i) => map[name] = 160 + i)
    const greek = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigmaf sigma tau upsilon phi chi psi omega".split(" ")
    greek.forEach((name, i) => {
        map[name] = 945 + i
        if (name !== "sigmaf") map[name[0].toUpperCase() + name.slice(1)] = 913 + i
    })
    Object.assign(map, {
        OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, fnof: 402, circ: 710, tilde: 732, ndash: 8211,
        mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222, dagger: 8224,
        Dagger: 8225, bull: 8226, hellip: 8230, permil: 8240, lsaquo: 8249, rsaquo: 8250, euro: 8364, trade: 8482,
    })
    return map
})()

// ENT_NOQUOTES: &quot; is left as is.
const decodeEntities = (s: string): string =>
    s.replace(/&(#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g, (whole, body: string) => {
        if (body[0] === "#") {
            const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
            return code > 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : whole
        }
        const code = NAMED_ENTITIES[body]
        return code === undefined ? whole : String.fromCodePoint(code)
    })

const HEADER = /^#awkwords\s/m

const decode = (input: string | Uint8Array): { text: string, legacy: boolean, cp1250: boolean } => {
    if (typeof input === "string") return {text: input, legacy: false, cp1250: false}
    const loose = new TextDecoder("utf-8").decode(input)
    if (HEADER.test(loose)) return {text: loose, legacy: false, cp1250: false}
    // A headerless file that is valid UTF-8 was written by hand or is plain ASCII; only invalid UTF-8 means cp1250.
    try {
        return {text: new TextDecoder("utf-8", {fatal: true}).decode(input), legacy: true, cp1250: false}
    } catch {
        return {text: new TextDecoder("windows-1250").decode(input), legacy: true, cp1250: true}
    }
}

const FILE_LINE = /^(#|nle|filterdup|n:|r:|[A-Z]?:)/

type Row = { letter: string, src: Source }

const phpInt = (s: string): number => {
    const m = /^\s*[+-]?\d+/.exec(s)
    return m ? parseInt(m[0], 10) : 0
}

// --- Conversion ---

type Analysis = {
    // Pass probability of each filtered fragment and the outputs it can produce before filtering.
    filtered: Map<Frag, { pass: number, outputs: string[] }>
} | null

class TooLarge extends Error {
}

type Dist = Map<string, number>

const analyse = (rules: Map<string, Alt>, main: Alt): Analysis => {
    const filtered = new Map<Frag, { pass: number, outputs: string[] }>()
    const memo = new Map<string, Dist>()

    const check = (d: Dist) => {
        if (d.size > MAX_DISTRIBUTION) throw new TooLarge()
        return d
    }
    const ofAlt = (alt: Alt): Dist => {
        const total = alt.reduce((a, o) => a + o.weight, 0)
        const out: Dist = new Map()
        for (const o of alt) {
            for (const [s, p] of ofOption(o)) out.set(s, (out.get(s) ?? 0) + p * o.weight / total)
        }
        return check(out)
    }
    const ofOption = (o: Option): Dist => {
        let acc: Dist = new Map([["", 1]])
        for (const f of o.frags) {
            const d = ofFrag(f)
            const next: Dist = new Map()
            for (const [a, pa] of acc) for (const [b, pb] of d) next.set(a + b, (next.get(a + b) ?? 0) + pa * pb)
            acc = check(next)
        }
        return acc
    }
    const ofRule = (letter: string): Dist => {
        let d = memo.get(letter)
        if (!d) {
            const alt = rules.get(letter)
            d = alt ? ofAlt(alt) : new Map([["", 1]])
            memo.set(letter, d)
        }
        return d
    }
    // Monke retries a filtered fragment, so downstream it produces its outputs conditioned on passing.
    const ofFrag = (f: Frag): Dist => {
        let d: Dist
        switch (f.kind) {
            case "lit":
                d = new Map([[f.text, 1]])
                break
            case "ref":
                d = ofRule(f.letter)
                break
            case "group":
                d = ofAlt(f.alt)
                break
            case "opt":
                d = new Map([["", 0.5]])
                for (const [s, p] of ofAlt(f.alt)) d.set(s, (d.get(s) ?? 0) + p / 2)
        }
        if (f.filters.length === 0) return d
        const kept: Dist = new Map([...d].filter(([s]) => !f.filters.includes(s)))
        const pass = [...kept.values()].reduce((a, b) => a + b, 0)
        filtered.set(f, {pass, outputs: [...d.keys()]})
        return new Map([...kept].map(([s, p]) => [s, p / pass]))
    }

    try {
        ofAlt(main)
        for (const letter of rules.keys()) ofRule(letter)
        return {filtered}
    } catch (e) {
        if (e instanceof TooLarge) return null
        throw e
    }
}

// Filtered fragments whose generation depends on an earlier choice (an alternative or optional around them, or in a
// rule that leads to them). Awkwords' whole-word rejection reweights those choices; Monke's per-rule retry does not.
const findUncertainFilters = (rules: Map<string, Alt>, main: Alt): Set<Frag> => {
    const uncertain = new Set<Frag>()
    const seen = new Map<string, boolean>()
    const visitRule = (letter: string, unsure: boolean) => {
        const before = seen.get(letter)
        if (before === true || before === unsure) return
        seen.set(letter, unsure)
        const alt = rules.get(letter)
        if (alt) visitAlt(alt, unsure)
    }
    const visitAlt = (alt: Alt, unsure: boolean) => {
        const inner = unsure || alt.length > 1
        for (const o of alt) for (const f of o.frags) visitFrag(f, inner)
    }
    const visitFrag = (f: Frag, unsure: boolean) => {
        if (unsure && f.filters.length > 0) uncertain.add(f)
        if (f.kind === "ref") visitRule(f.letter, unsure)
        if (f.kind === "group") visitAlt(f.alt, unsure)
        if (f.kind === "opt") visitAlt(f.alt, true)
    }
    visitAlt(main, false)
    return uncertain
}

const findCycle = (rules: Map<string, Alt>): string[] | null => {
    const refs = (alt: Alt): string[] => alt.flatMap(o => o.frags.flatMap(f =>
        f.kind === "ref" ? [f.letter] : f.kind === "lit" ? [] : refs(f.alt)))
    const done = new Set<string>()
    const path: string[] = []
    const visit = (l: string): string[] | null => {
        const at = path.indexOf(l)
        if (at >= 0) return [...path.slice(at), l]
        if (done.has(l) || !rules.has(l)) return null
        path.push(l)
        for (const next of refs(rules.get(l)!)) {
            const c = visit(next)
            if (c) return c
        }
        path.pop()
        done.add(l)
        return null
    }
    for (const l of rules.keys()) {
        const c = visit(l)
        if (c) return c
    }
    return null
}

const quote = (t: string) => `'${t.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`

const isNumeric = (s: string) => /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(s)

const newRule = (name: string, patterns: { pattern: string, weight: number }[], extra: Partial<Rule> = {}): Rule => {
    const rule: Rule = {
        id: crypto.randomUUID(),
        name,
        patterns: patterns.map((p): RulePattern => ({id: crypto.randomUUID(), pattern: p.pattern, weight: p.weight})),
        rewrites: [],
        exclusions: [],
        terminalOnly: false,
        showRewrites: false,
        showExclusions: false,
        collapsed: false,
        ...extra,
    }
    rule.showRewrites = rule.rewrites.length > 0
    rule.showExclusions = rule.exclusions.length > 0
    return rule
}

// A private-use character absent from the input, used only when a filter rejects empty output (see markedFilter).
const pickMarker = (text: string): string => {
    let code = 0xE000
    while (text.includes(String.fromCharCode(code))) code++
    return String.fromCharCode(code)
}

class Converter {
    private readonly names = new Set<string>()
    private filterCount = 0
    private marker: string | null = null

    constructor(
        private readonly text: string,
        private readonly analysis: Analysis,
        private readonly uncertain: Set<Frag>,
        private readonly warn: Warn,
    ) {
    }

    reserve(name: string) {
        this.names.add(name)
    }

    // Returns the rule followed by the helper rules its filters created.
    convertRule(name: string, where: string, alt: Alt): Rule[] {
        const helpers: Rule[] = []
        const weighted = alt.length > 1
        const terminal = alt.every(o => o.frags.length === 0 || (o.frags.length === 1 && o.frags[0].kind === "lit" && o.frags[0].filters.length === 0))
        if (terminal) {
            return [newRule(name, alt.map(o => ({
                pattern: o.frags.length === 0 ? "" : (o.frags[0] as { text: string }).text,
                weight: weighted ? o.weight : 1,
            })), {terminalOnly: true})]
        }
        const patterns = alt.map(o => ({pattern: this.emitOption(o, where, helpers), weight: weighted ? o.weight : 1}))
        return [newRule(name, patterns), ...helpers]
    }

    private emitOption(o: Option, where: string, helpers: Rule[]): string {
        return o.frags.length === 0 ? "''" : o.frags.map(f => this.emitFrag(f, where, helpers)).join(".")
    }

    private emitAlt(alt: Alt, where: string, helpers: Rule[]): string {
        const weighted = alt.some(o => o.weight !== 1)
        return alt.map(o => this.emitOption(o, where, helpers) + (weighted && o.weight !== 1 ? `*${o.weight}` : "")).join(" / ")
    }

    private emitFrag(f: Frag, where: string, helpers: Rule[]): string {
        if (f.filters.length > 0) return this.filtered(f, where, helpers)
        switch (f.kind) {
            case "lit":
                return quote(f.text)
            case "ref":
                return f.letter
            case "group":
                return f.alt.length === 1 ? this.emitOption(f.alt[0], where, helpers) : `[${this.emitAlt(f.alt, where, helpers)}]`
            case "opt":
                return f.alt.length === 1 ? `(${this.emitOption(f.alt[0], where, helpers)})` : `([${this.emitAlt(f.alt, where, helpers)}])`
        }
    }

    private uniqueName(base: string): string {
        let name = base
        for (let i = 2; this.names.has(name); i++) name = `${base}_${i}`
        this.names.add(name)
        return name
    }

    // A filter compares the fragment's whole output with its text. On a helper rule holding only that fragment,
    // the exclusion ^.'text'.$ matches exactly that output: ^ and $ pin the match to the rule's whole output.
    private filtered(f: Frag, where: string, helpers: Rule[]): string {
        const name = this.uniqueName(`Filtered${++this.filterCount}`)
        const own: Rule[] = []
        const bare = {...f, filters: []} as Frag
        const patterns = f.kind === "group" && f.alt.length > 1 ?
            f.alt.map(o => ({pattern: this.emitOption(o, where, own), weight: o.weight})) :
            [{pattern: this.emitFrag(bare, where, own), weight: 1}]

        this.reportFilter(f, where, name)

        if (!f.filters.includes("")) {
            helpers.push(newRule(name, patterns, {
                exclusions: f.filters.map(t => ({id: crypto.randomUUID(), match: `^.${quote(t)}.$`})),
            }), ...own)
            return name
        }

        // An exclusion only fires on a non-empty match, so it cannot reject an empty output by itself. The marked
        // rule prefixes every output with a marker that occurs nowhere else, ^.'marker'.$ then means "empty output",
        // and the rule using it removes the marker.
        this.marker ??= pickMarker(this.text)
        const m = this.marker
        const marked = this.uniqueName(`${name}Marked`)
        helpers.push(
            newRule(name, [{pattern: marked, weight: 1}], {
                rewrites: [{id: crypto.randomUUID(), match: quote(m), replace: "''"}],
            }),
            newRule(marked, patterns.map(p => ({pattern: `${quote(m)}.${p.pattern}`, weight: p.weight})), {
                exclusions: f.filters.map(t => ({id: crypto.randomUUID(), match: `^.${quote(m + t)}.$`})),
            }),
            ...own,
        )
        return name
    }

    private reportFilter(f: Frag, where: string, name: string) {
        const filters = f.filters.map(t => `^${t}`).join("")
        const info = this.analysis?.filtered.get(f)
        if (info && info.pass === 0) {
            this.warn("allFiltered", `The filter ${filters} on ${f.src} in ${where} removes every possible result, so Awkwords could never produce a word here. Monke will report rule ${name} as too restrictive.`)
        } else if (info && info.pass < RARE_PASS) {
            this.warn("rare", `The filters on ${f.src} in ${where} reject ${Math.round((1 - info.pass) * 100)}% of results. Monke retries rule ${name} up to 100 times and may stop with an error.`)
        }
        if (info) {
            for (const t of f.filters) {
                if (!isNumeric(t)) continue
                if (info.outputs.some(s => s !== t && isNumeric(s) && Number(s) === Number(t))) {
                    this.warn("looseEquality", `Filter ^${t} in ${where} is a number; Awkwords also rejected other spellings of the same number. Monke rejects only ${t}.`)
                }
            }
        }
        if (this.uncertain.has(f) && (!info || info.pass < 1)) {
            this.warn("approximateOdds", `The filter ${filters} on ${f.src} in ${where} is inside an alternative or an optional. Awkwords dropped the whole word, Monke regenerates only rule ${name}, so the same words come out but probabilities may differ slightly.`)
        }
    }
}

export const importAwkwords = (input: string | Uint8Array, fileName?: string): AwkwordsImport => {
    const warnings: AwkwordsWarning[] = []
    const seenWarnings = new Set<string>()
    const warn: Warn = (code, message) => {
        if (seenWarnings.has(message)) return
        seenWarnings.add(message)
        warnings.push({code, message})
    }

    const {text, legacy, cp1250} = decode(input)
    const lines = text.split("\n").map(l => l.endsWith("\r") ? l.slice(0, -1) : l)
    if (lines.every(l => l.trim() === "")) throw new AwkwordsError("There is nothing to import", 1, 1)

    const rows: Row[] = []
    let main: Source | null = null
    let wordCount: number | undefined
    let filterDuplicates: boolean | undefined
    let listOutput: boolean | undefined
    const encoder = new TextEncoder()

    if (!lines.some(l => FILE_LINE.test(l))) {
        // A bare pattern, as typed in Awkwords' pattern box.
        const filled = lines.flatMap((l, i) => l.trim() === "" ? [] : [i])
        if (filled.length > 1) {
            throw new AwkwordsError("A pasted pattern must fit on one line. To paste several, use the .awkw form: V:a/i/u for subpatterns and r:CV for the main pattern", filled[1] + 1, 1)
        }
        main = {where: "the main pattern", text: lines[filled[0]], line: filled[0] + 1, column: 1}
    } else {
        filterDuplicates = false
        listOutput = false
        for (const [i, line] of lines.entries()) {
            const lineNo = i + 1
            if (encoder.encode(line).length > MAX_LINE_BYTES) {
                warn("longLine", `Line ${lineNo} is longer than Awkwords could load; it was imported in full.`)
            }
            const rest = (k: number) => legacy ? decodeEntities(line.slice(k)) : line.slice(k)
            if (line.startsWith("#")) continue
            if (line.startsWith("nle")) listOutput = true
            else if (line.startsWith("filterdup")) filterDuplicates = true
            else if (line.startsWith("n:")) {
                const n = phpInt(line.slice(2))
                if (n >= 1) wordCount = Math.min(n, 9999)
            } else if (line.startsWith("r:")) main = {where: "the main pattern", text: rest(2), line: lineNo, column: 3}
            else if (/^[A-Z]?:/.test(line)) {
                const letter = line[0] === ":" ? "" : line[0]
                const k = letter ? 2 : 1
                rows.push({letter, src: {where: `subpattern ${letter}`, text: rest(k), line: lineNo, column: k + 1}})
            } else if (line.trim() !== "") {
                warn("ignoredLine", `Line ${lineNo} was not understood and was skipped: ${line}`)
            }
        }
    }

    if (cp1250) warn("legacy", "This file is from Awkwords 1.1 or older; it was converted from the cp1250 encoding.")

    const effective = new Map<string, Source>()
    const counts = new Map<string, number>()
    for (const row of rows) {
        if (!row.letter) {
            if (row.src.text !== "") warn("noName", `A subpattern without a letter was skipped: ${row.src.text}`)
            continue
        }
        counts.set(row.letter, (counts.get(row.letter) ?? 0) + 1)
        // Map keeps the first insertion's position: rules follow first appearance, contents follow the last.
        effective.set(row.letter, row.src)
    }
    for (const [letter, n] of counts) {
        if (n > 1) warn("duplicateLetter", `Subpattern ${letter} is defined ${n} times; the last one was used, as in Awkwords.`)
    }

    if (!main) {
        warn("noMainPattern", `There is no main pattern (r: line), so rule ${ROOT} generates nothing.`)
        main = {where: "the main pattern", text: "", line: 1, column: 1}
    }

    const sources = [...effective.values(), main]
    for (const src of sources) checkBrackets(src)

    const alts = new Map<string, Alt>()
    for (const [letter, src] of effective) {
        if (hasQuotedBracket(src.text)) {
            warn("quotedBracket", `Subpattern ${letter} has a quoted bracket: ${src.text}. Awkwords did not read it as text when the subpattern was used; Monke does. Check the imported rule.`)
        }
        alts.set(letter, parseAlt(src.text, src.where, warn))
    }
    const mainAlt = parseAlt(main.text, main.where, warn)

    const undefinedLetters: string[] = []
    const collectRefs = (alt: Alt) => alt.forEach(o => o.frags.forEach(f => {
        if (f.kind === "ref" && !alts.has(f.letter) && !undefinedLetters.includes(f.letter)) undefinedLetters.push(f.letter)
        if (f.kind === "group" || f.kind === "opt") collectRefs(f.alt)
    }))
    for (const alt of [...alts.values(), mainAlt]) collectRefs(alt)
    for (const letter of undefinedLetters) {
        warn("undefinedLetter", `The letter ${letter} has no subpattern, so Awkwords generated nothing for it. An empty rule ${letter} was added. To write a capital letter, Awkwords needed "${letter}"; in Monke write '${letter}'.`)
    }

    const cycle = findCycle(alts)
    if (cycle) {
        warn("cycle", `Subpatterns ${cycle.join(" > ")} refer to each other in a loop. Awkwords refused to generate with this; fix it before generating.`)
    }

    const analysis = cycle ? null : analyse(alts, mainAlt)
    const converter = new Converter(text, analysis, findUncertainFilters(alts, mainAlt), warn)
    for (const name of [...alts.keys(), ...undefinedLetters, ROOT]) converter.reserve(name)

    const rules: Rule[] = []
    for (const [letter, alt] of alts) rules.push(...converter.convertRule(letter, `subpattern ${letter}`, alt))
    for (const letter of undefinedLetters) rules.push(newRule(letter, [{pattern: "''", weight: 1}]))
    rules.push(...converter.convertRule(ROOT, "the main pattern", mainAlt))

    const allAlts = [...alts.values(), mainAlt]
    const anyWeight = (alt: Alt): boolean => alt.some(o =>
        (alt.length > 1 && o.weight !== 1) || o.frags.some(f => (f.kind === "group" || f.kind === "opt") && anyWeight(f.alt)))

    const language = fileName?.replace(/\.(awkw|txt)$/i, "").trim() || DEFAULT_LANGUAGE

    return {
        config: {
            language,
            root: ROOT,
            rules,
            enableWeights: allAlts.some(anyWeight),
            enableSerif: false,
            repeatRewrites: false,
            features: [],
            seed: "",
        },
        wordCount,
        filterDuplicates,
        listOutput,
        warnings,
    }
}
