import {describe, expect, it} from "vitest"
import {AwkwordsError, importAwkwords} from "./awkwords.ts"
import {configToGrammar} from "./buildGrammar.ts"
import {Config} from "./config.ts"
import {generate} from "./generate.ts"
import {Expr, Grammar, Rule} from "./grammar.ts"
import {matchesExclusion} from "./match.ts"
import {mulberry32} from "./test-helpers.ts"

type Dist = Map<string, number>

// Exact output distribution of a Monke grammar: every choice is expanded, rewrites applied, excluded outputs dropped
// and the rest renormalised, which is what the generator's per-rule retry converges to.
const enumerate = (config: Config): Dist => {
    const g = configToGrammar(config)!
    const memo = new Map<string, Dist>()
    const ofRule = (r: Rule): Dist => {
        let d = memo.get(r.name)
        if (d) return d
        const out: Dist = new Map()
        for (const [generated, p] of ofExpr(g, r.expr)) {
            let s = generated
            for (const [match, replace] of r.rewrites) {
                if (match.tag !== "Atom" || replace.tag !== "Atom") throw new Error("only literal rewrites are enumerated")
                s = s.split(match.value).join(replace.value)
            }
            if (!matchesExclusion(g, r, s)) out.set(s, (out.get(s) ?? 0) + p)
        }
        const total = [...out.values()].reduce((a, b) => a + b, 0)
        d = new Map([...out].map(([s, p]) => [s, p / total]))
        memo.set(r.name, d)
        return d
    }
    const ofExpr = (g: Grammar, e: Expr): Dist => {
        switch (e.tag) {
            case "Atom":
                return new Map([[e.value, 1]])
            case "Ref":
                return ofRule(g.ruleMap.get(e.rule)!)
            case "Seq":
                return e.items.reduce<Dist>((acc, item) => {
                    const next: Dist = new Map()
                    for (const [a, pa] of acc) for (const [b, pb] of ofExpr(g, item)) next.set(a + b, (next.get(a + b) ?? 0) + pa * pb)
                    return next
                }, new Map([["", 1]]))
            case "Choice": {
                const total = g.useWeights ? e.items.reduce((a, o) => a + o.weight, 0) : e.items.length
                const out: Dist = new Map()
                for (const o of e.items) {
                    const w = (g.useWeights ? o.weight : 1) / total
                    for (const [s, p] of ofExpr(g, o.expr)) out.set(s, (out.get(s) ?? 0) + p * w)
                }
                return out
            }
            default:
                throw new Error(`not enumerated: ${e.tag}`)
        }
    }
    return ofRule(g.ruleMap.get(g.root)!)
}

const expectDist = (actual: Dist, expected: Record<string, number>) => {
    expect([...actual.keys()].sort()).toEqual(Object.keys(expected).sort())
    for (const [s, p] of Object.entries(expected)) expect(actual.get(s)!).toBeCloseTo(p, 9)
}

const file = (...lines: string[]) => ["#awkwords version 1.2", ...lines, "n:100", ""].join("\n")

// Rules as compact text: name, T(erminal) or P(attern), patterns with @weight, exclusions, rewrites.
const shape = (config: Config) => config.rules.map(r => {
    const patterns = r.patterns.map(p => p.weight === 1 ? p.pattern : `${p.pattern}@${p.weight}`)
    const x = r.exclusions.map(e => e.match)
    const rw = r.rewrites.map(w => `${w.match}->${w.replace}`)
    return [`${r.name} ${r.terminalOnly ? "T" : "P"}[${patterns.join(", ")}]`, x.length ? `X:${x.join(", ")}` : "", rw.length ? `Rw:${rw.join(", ")}` : ""]
        .filter(Boolean).join(" ")
})

const codes = (text: string | Uint8Array) => importAwkwords(text).warnings.map(w => w.code)

describe("Awkwords import: spec corpus", () => {
    it("1. literals and subpatterns", () => {
        const {config, warnings} = importAwkwords(file("V:a/i/u", "C:p/t", "r:CV"))
        expect(shape(config)).toEqual(["V T[a, i, u]", "C T[p, t]", "Word P[C.V]"])
        expect(warnings).toEqual([])
        expectDist(enumerate(config), Object.fromEntries(["pa", "pi", "pu", "ta", "ti", "tu"].map(w => [w, 1 / 6])))
    })

    it("2. a literal run ignores spaces", () => {
        const {config} = importAwkwords(file("r:ka na/to"))
        expect(shape(config)).toEqual(["Word T[kana, to]"])
        expectDist(enumerate(config), {kana: 0.5, to: 0.5})
    })

    it("3. groups", () => {
        const {config} = importAwkwords(file("r:s[tu/top/kan]"))
        expect(shape(config)).toEqual(["Word P['s'.['tu' / 'top' / 'kan']]"])
        expectDist(enumerate(config), {stu: 1 / 3, stop: 1 / 3, skan: 1 / 3})
    })

    it("4. nested optionals", () => {
        const {config} = importAwkwords(file("r:at(a(z))"))
        expect(shape(config)).toEqual(["Word P['at'.('a'.('z'))]"])
        expectDist(enumerate(config), {at: 0.5, ata: 0.25, ataz: 0.25})
    })

    it("5. a choice inside an optional is grouped", () => {
        const {config} = importAwkwords(file("r:s(tu/top/kan)"))
        expect(shape(config)).toEqual(["Word P['s'.(['tu' / 'top' / 'kan'])]"])
        expectDist(enumerate(config), {s: 0.5, stu: 1 / 6, stop: 1 / 6, skan: 1 / 6})
    })

    it("6. weights anywhere in an option, and nested", () => {
        const top = importAwkwords(file("r:a/b*3/k*6ek")).config
        expect(shape(top)).toEqual(["Word T[a, b@3, kek@6]"])
        expect(top.enableWeights).toBe(true)
        expectDist(enumerate(top), {a: 0.1, b: 0.3, kek: 0.6})

        const nested = importAwkwords(file("r:x[a/b*3]")).config
        expect(shape(nested)).toEqual(["Word P['x'.['a' / 'b'*3]]"])
        expect(nested.enableWeights).toBe(true)
        expectDist(enumerate(nested), {xa: 0.25, xb: 0.75})
    })

    it("7. weights are clamped and concatenated as Awkwords read them", () => {
        const {config, warnings} = importAwkwords(file("r:a*200/b*0/c*1*2"))
        expect(shape(config)).toEqual(["Word T[a@128, b, c@12]"])
        expect(warnings.map(w => w.message)).toEqual([
            "Weight *200 in the main pattern was read by Awkwords as 128.",
            "Weight *0 in the main pattern was read by Awkwords as 1.",
            "Weight *1*2 in the main pattern was read by Awkwords as 12.",
        ])
    })

    it("8. escapes", () => {
        const help = importAwkwords(file('r:heh"[mY/worD)]"')).config
        expect(shape(help)).toEqual(["Word T[heh[mY/worD)]]"])
        expectDist(enumerate(help), {"heh[mY/worD)]": 1})

        const quotes = importAwkwords(file(`r:a""b'c\\[d]`)).config
        expect(shape(quotes)).toEqual([`Word P['a"b\\'c\\\\'.'d']`])
        expectDist(enumerate(quotes), {[`a"b'c\\d`]: 1})
    })

    it("9. empty options, including a trailing one (kept, with a warning)", () => {
        const leading = importAwkwords(file("r:x[/a]"))
        expect(shape(leading.config)).toEqual(["Word P['x'.['' / 'a']]"])
        expectDist(enumerate(leading.config), {x: 0.5, xa: 0.5})

        const trailing = importAwkwords(file("r:x[a/]"))
        expect(shape(trailing.config)).toEqual(["Word P['x'.['a' / '']]"])
        expect(trailing.warnings.map(w => w.code)).toEqual(["trailingEmpty"])
        expectDist(enumerate(trailing.config), {x: 0.5, xa: 0.5})

        expect(shape(importAwkwords(file("V:/a", "r:V")).config)[0]).toBe("V T[, a]")
    })

    it("10. a filter on a fragment that is always generated maps exactly (help example)", () => {
        const {config, warnings} = importAwkwords(file("V:a/i/u", "r:[VV]t[VV]^aa^ii^uu"))
        expect(shape(config)).toEqual([
            "V T[a, i, u]",
            "Word P[V.V.'t'.Filtered1]",
            "Filtered1 P[V.V] X:^.'aa'.$, ^.'ii'.$, ^.'uu'.$",
        ])
        expect(warnings).toEqual([])
        const vv = ["a", "i", "u"].flatMap(a => ["a", "i", "u"].map(b => a + b))
        const kept = vv.flatMap(a => vv.filter(b => b[0] !== b[1]).map(b => `${a}t${b}`))
        expect(kept).toHaveLength(54)
        expectDist(enumerate(config), Object.fromEntries(kept.map(w => [w, 1 / 54])))
    })

    it("11. a filter inside an alternative keeps the same words, with a warning about odds", () => {
        const {config, warnings} = importAwkwords(file("C:p/t", "V:a/i", "r:CV^a/C"))
        expect(shape(config)).toEqual(["C T[p, t]", "V T[a, i]", "Word P[C.Filtered1, C]", "Filtered1 P[V] X:^.'a'.$"])
        expect(warnings.map(w => w.code)).toEqual(["approximateOdds"])
        expect(warnings[0].message).toContain("probabilities may differ slightly")
        // Awkwords keeps {pi: 1/6, ti: 1/6, p: 1/3, t: 1/3}: same words, different odds.
        expectDist(enumerate(config), {pi: 0.25, ti: 0.25, p: 0.25, t: 0.25})
    })

    it("12. word boundaries make a filter an exact comparison, where a plain exclusion would not be", () => {
        const {config} = importAwkwords(file("r:[a/ab]^a"))
        expect(shape(config)).toEqual(["Word P[Filtered1]", "Filtered1 P['a', 'ab'] X:^.'a'.$"])
        expectDist(enumerate(config), {ab: 1})

        const g = configToGrammar(config)!
        const helper = g.ruleMap.get("Filtered1")!
        expect(matchesExclusion(g, helper, "a")).toBe(true)
        expect(matchesExclusion(g, helper, "ab")).toBe(false)
        expect(matchesExclusion(g, helper, "ba")).toBe(false)
        const plain = configToGrammar({...config, rules: config.rules.map(r => r.name !== "Filtered1" ? r :
                {...r, exclusions: [{id: "x", match: "'a'"}]})})!
        expect(matchesExclusion(plain, plain.ruleMap.get("Filtered1")!, "ab")).toBe(true)
    })

    it("13. a filter on an optional", () => {
        const {config, warnings} = importAwkwords(file("r:k(a/i)^i"))
        expect(shape(config)).toEqual(["Word P['k'.Filtered1]", "Filtered1 P[(['a' / 'i'])] X:^.'i'.$"])
        expect(warnings).toEqual([])
        expectDist(enumerate(config), {k: 2 / 3, ka: 1 / 3})
    })

    it("14. the character after a filter is kept (Awkwords skipped it by mistake)", () => {
        const {config, warnings} = importAwkwords(file("V:a/i", "r:[VV]^aaV"))
        expect(shape(config)).toEqual(["V T[a, i]", "Word P[Filtered1.V]", "Filtered1 P[V.V] X:^.'aa'.$"])
        expect(warnings).toEqual([])
        expectDist(enumerate(config), Object.fromEntries(["ai", "ia", "ii"].flatMap(p => ["a", "i"].map(v => [p + v, 1 / 6]))))
    })

    it("15. a whitespace-only filter rejects empty output through a marker", () => {
        const {config} = importAwkwords(file("r:x(a)^ "))
        expect(shape(config)).toEqual([
            "Word P['x'.Filtered1]",
            "Filtered1 P[Filtered1Marked] Rw:'\uE000'->''",
            "Filtered1Marked P['\uE000'.('a')] X:^.'\uE000'.$",
        ])
        expectDist(enumerate(config), {xa: 1})
    })

    it("16. undefined, duplicate and cyclic subpatterns", () => {
        const {config, warnings} = importAwkwords(file("A:x", "A:y", "r:AB"))
        expect(shape(config)).toEqual(["A T[y]", "B P['']", "Word P[A.B]"])
        expect(warnings.map(w => w.code)).toEqual(["duplicateLetter", "undefinedLetter"])
        expectDist(enumerate(config), {y: 1})

        expect(codes(file("A:B", "B:A", "r:A"))).toEqual(["cycle"])
    })

    it("17. legacy cp1250 files", () => {
        const bytes = Uint8Array.from([..."V:"].map(c => c.charCodeAt(0)).concat([0xE1], [..."/e\nr:V\nn:5\n"].map(c => c.charCodeAt(0))))
        const result = importAwkwords(bytes)
        expect(shape(result.config)).toEqual(["V T[á, e]", "Word P[V]"])
        expect(result.warnings.map(w => w.code)).toEqual(["legacy"])
        expect(result.wordCount).toBe(5)
    })
})

describe("Awkwords import: details", () => {
    it("matches the generator, not only the enumerator", () => {
        const {config} = importAwkwords(file("V:a/i/u", "r:[VV]t[VV]^aa^ii^uu"))
        const g = configToGrammar(config)!
        const rng = mulberry32(7)
        const seen = new Set(Array.from({length: 3000}, () => generate(g, rng)))
        expect([...seen].sort()).toEqual([...enumerate(config).keys()].sort())
    })

    it("nested filters compose", () => {
        const {config} = importAwkwords(file("V:a/i", "r:[[VV]^aa V]^iai"))
        expect(shape(config)).toEqual(["V T[a, i]", "Word P[Filtered1]", "Filtered1 P[Filtered2.V] X:^.'iai'.$", "Filtered2 P[V.V] X:^.'aa'.$"])
        const words = ["ai", "ia", "ii"].flatMap(p => ["a", "i"].map(v => p + v)).filter(w => w !== "iai")
        expectDist(enumerate(config), Object.fromEntries(words.map(w => [w, 1 / 5])))
    })

    it("a filter on a subpattern letter affects only that use", () => {
        const {config} = importAwkwords(file("V:a/i", "r:VV^a"))
        expect(shape(config)).toEqual(["V T[a, i]", "Word P[V.Filtered1]", "Filtered1 P[V] X:^.'a'.$"])
        expectDist(enumerate(config), {ai: 0.5, ii: 0.5})
    })

    it("a filter inside a subpattern used under a choice warns about odds", () => {
        expect(codes(file("V:a/i", "S:[VV]^aa", "r:S/V"))).toEqual(["approximateOdds"])
        expect(codes(file("V:a/i", "S:[VV]^aa", "r:SV"))).toEqual([])
    })

    it("a filter that can never fire does not warn about odds", () => {
        expect(codes(file("r:[a/b]^c/d"))).toEqual([])
    })

    it("reports filters that reject everything or almost everything", () => {
        expect(codes(file("V:a", "r:V^a"))).toEqual(["allFiltered"])
        const letters = "abcdefghijklmnopqrstuvwxyz".split("")
        expect(codes(file(`r:[${letters.join("/")}]^${letters.slice(1).join("^")}`))).toEqual(["rare"])
    })

    it("warns that Awkwords compared numeric filters loosely", () => {
        expect(codes(file("r:[1/01]^1"))).toEqual(["looseEquality"])
    })

    it("quoted capitals, brackets and non-ASCII letters are literal", () => {
        const {config, warnings} = importAwkwords(file('r:"A(b)"Á'))
        expect(shape(config)).toEqual(["Word T[A(b)Á]"])
        expect(warnings).toEqual([])
    })

    it("reads quoted brackets inside brackets as text and warns", () => {
        const {config, warnings} = importAwkwords(file('r:[a"]"/b]'))
        expect(shape(config)).toEqual(["Word P[['a]' / 'b']]"])
        expect(warnings.map(w => w.code)).toEqual(["quotedBracket"])
    })

    it("escapes inside a filter", () => {
        const {config} = importAwkwords(file('r:[a/"/"]^"/"'))
        expect(shape(config)).toEqual(["Word P[Filtered1]", "Filtered1 P['a', '/'] X:^.'/'.$"])
        expectDist(enumerate(config), {a: 1})
    })

    it("ignores empty filters", () => {
        const {config, warnings} = importAwkwords(file("r:^a[b]^"))
        // A filter before any fragment swallows its text ("a") and filters nothing.
        expect(shape(config)).toEqual(["Word P['b']"])
        expect(warnings.map(w => w.code)).toEqual(["emptyFilter", "emptyFilter"])
    })

    it("reads generator settings", () => {
        const result = importAwkwords("#awkwords version 1.2\r\nr:a\r\nn:42\r\nnle\r\nfilterdup\r\n", "My lang.awkw")
        expect(result).toMatchObject({wordCount: 42, listOutput: true, filterDuplicates: true})
        expect(result.config.language).toBe("My lang")
        expect(shape(result.config)).toEqual(["Word T[a]"])
        expect(importAwkwords(file("r:a"))).toMatchObject({listOutput: false, filterDuplicates: false})
    })

    it("accepts a bare pattern", () => {
        const result = importAwkwords("CV(CV)\n")
        expect(shape(result.config)).toEqual(["C P['']", "V P['']", "Word P[C.V.(C.V)]"])
        expect(result.config.language).toBe("Awkwords import")
        expect(result.wordCount).toBeUndefined()
        expect(result.listOutput).toBeUndefined()
    })

    it("skips unnamed rows and reports unknown lines, long lines and a missing main pattern", () => {
        expect(codes(file(":abc", "V:a", "hello"))).toEqual(["ignoredLine", "noName", "noMainPattern"])
        expect(codes(file(`r:${"a".repeat(300)}`))).toEqual(["longLine"])
    })

    it("decodes HTML entities in headerless files", () => {
        const bytes = new TextEncoder().encode("V:&eacute;/&#283;/&quot;\nr:V\n")
        expect(shape(importAwkwords(bytes).config)[0]).toBe("V T[é, ě, &quot;]")
    })

    it("rejects unmatched brackets with their position", () => {
        expect(() => importAwkwords(file("V:a/i", "r:a[b"))).toThrow(new AwkwordsError('"[" in the main pattern is never closed', 3, 4))
        expect(() => importAwkwords(file("V:a)"))).toThrow(new AwkwordsError('Unmatched ")" in subpattern V', 2, 4))
        expect(() => importAwkwords("[a)")).toThrow(new AwkwordsError('")" in the main pattern does not close the "[" at column 1', 1, 3))
        expect(() => importAwkwords(file('r:"("'))).not.toThrow()
    })

    it("rejects empty input and multi-line bare patterns", () => {
        expect(() => importAwkwords("  \n")).toThrow(AwkwordsError)
        expect(() => importAwkwords("CV\nCVC")).toThrow(/line 2, column 1/)
    })

    it("every imported config builds a grammar", () => {
        for (const text of [file("V:a/i/u", "C:p/t/k/s/m/n", "N:m/n", "r:CV(CV)(N)"), file("r:(a*3/b)^b[c]")]) {
            expect(configToGrammar(importAwkwords(text).config)).not.toBeNull()
        }
    })
})
