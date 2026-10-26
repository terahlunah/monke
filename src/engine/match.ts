import {Expr, Grammar, Rule} from "./grammar.ts";

// Matchers are generators so a sequence can backtrack into the alternatives of an
// earlier item. Each yielded array holds one length per sub-part of the expression.
// Sub-matches may be empty (optionals); callers decide whether an empty overall match counts.
function* matchSeq(g: Grammar, items: Expr[], s: string): Generator<number[]> {
    if (items.length === 0) {
        yield []
        return
    }

    for (const first of matchExpr(g, items[0], s)) {
        // A nested match reports one length per sub-part; the item as a whole
        // consumes their sum and counts as a single back-reference.
        const consumed = first.reduce((a, b) => a + b, 0)
        for (const rest of matchSeq(g, items.slice(1), s.substring(consumed))) {
            yield [consumed, ...rest]
        }
    }
}

function* matchQuantifier(g: Grammar, expr: Expr, min: number, max: number, s: string): Generator<number[]> {
    for (let i = min; i <= max; ++i) {
        yield* matchSeq(g, Array(i).fill(expr), s)
    }
}

function* matchExpr(g: Grammar, e: Expr, s: string): Generator<number[]> {
    switch (e.tag) {
        case 'Atom':
            if (s.startsWith(e.value)) yield [e.value.length]
            return
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule)
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            yield* matchExpr(g, rule.expr, s)
            return
        }
        case 'Match':
            throw new Error(`Encountered ambiguous match expression #${e.index}#`)
        case "Seq":
            yield* matchSeq(g, e.items, s)
            return
        case "Choice":
            for (const c of e.items) yield* matchExpr(g, c.expr, s)
            return
        case "Quantifier":
            yield* matchQuantifier(g, e.expr, e.min, e.max, s)
    }
}

// First match anchored at the start of `s` that consumes at least one character.
export const matchNonEmpty = (g: Grammar, e: Expr, s: string): number[] | null => {
    for (const m of matchExpr(g, e, s)) {
        if (m.some(l => l > 0)) return m
    }
    return null
}

export const matchesExclusion = (g: Grammar, r: Rule, gen: string): boolean => {
    for (const e of r.exclusions) {
        for (let i = 0; i < gen.length; i++) {
            if (matchNonEmpty(g, e, gen.slice(i)) !== null) {
                return true
            }
        }
    }

    return false
}
