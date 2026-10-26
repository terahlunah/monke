import {Expr, Grammar, Rule} from "./grammar.ts";

// Matchers are generators so a sequence can backtrack into the alternatives of an
// earlier item. Each yielded array holds one length per sub-part of the expression.
// Sub-matches may be empty (optionals); callers decide whether an empty overall match counts.
// They work on the whole text plus a position so boundaries can tell where the text starts and ends.
// `parts` holds the text matched by earlier parts of the top-level sequence, for `#n#`.
// In the top-level sequence (`capture`), each matched item becomes a part later items can refer to.
function* matchSeq(g: Grammar, items: Expr[], text: string, pos: number, parts: string[], capture = false): Generator<number[]> {
    if (items.length === 0) {
        yield []
        return
    }

    for (const first of matchExpr(g, items[0], text, pos, parts)) {
        // A nested match reports one length per sub-part; the item as a whole
        // consumes their sum and counts as a single back-reference.
        const consumed = first.reduce((a, b) => a + b, 0)
        const next = capture ? [...parts, text.slice(pos, pos + consumed)] : parts
        for (const rest of matchSeq(g, items.slice(1), text, pos + consumed, next, capture)) {
            yield [consumed, ...rest]
        }
    }
}

function* matchQuantifier(g: Grammar, expr: Expr, min: number, max: number, text: string, pos: number, parts: string[]): Generator<number[]> {
    for (let i = min; i <= max; ++i) {
        yield* matchSeq(g, Array(i).fill(expr), text, pos, parts)
    }
}

function* matchExpr(g: Grammar, e: Expr, text: string, pos: number, parts: string[]): Generator<number[]> {
    switch (e.tag) {
        case 'Atom':
            if (text.startsWith(e.value, pos)) yield [e.value.length]
            return
        case 'Boundary':
            if (pos === (e.edge === "start" ? 0 : text.length)) yield [0]
            return
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule)
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            yield* matchExpr(g, rule.expr, text, pos, [])
            return
        }
        case 'Match': {
            const part = parts[e.index]
            if (part === undefined) throw new Error(`Encountered ambiguous match expression #${e.index}#`)
            if (text.startsWith(part, pos)) yield [part.length]
            return
        }
        case "Seq":
            yield* matchSeq(g, e.items, text, pos, parts)
            return
        case "Choice":
            for (const c of e.items) yield* matchExpr(g, c.expr, text, pos, parts)
            return
        case "Quantifier":
            yield* matchQuantifier(g, e.expr, e.min, e.max, text, pos, parts)
    }
}

// First match starting at `pos` that consumes at least one character.
export const matchNonEmpty = (g: Grammar, e: Expr, text: string, pos: number): number[] | null => {
    const matches = e.tag === "Seq" ? matchSeq(g, e.items, text, pos, [], true) : matchExpr(g, e, text, pos, [])
    for (const m of matches) {
        if (m.some(l => l > 0)) return m
    }
    return null
}

export const matchesExclusion = (g: Grammar, r: Rule, gen: string): boolean => {
    for (const e of r.exclusions) {
        for (let i = 0; i < gen.length; i++) {
            if (matchNonEmpty(g, e, gen, i) !== null) {
                return true
            }
        }
    }

    return false
}
