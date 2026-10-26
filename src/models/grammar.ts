export type Grammar = {
    rules: Rule[];
    ruleMap: Map<string, Rule>;
    root: string;
    useWeights: boolean
}

export type Rule = {
    name: string;
    expr: Expr;
    exclusions: Expr[];
    rewrites: [Expr, Expr][];
}

export type Expr =
    | { tag: 'Atom', value: string }
    | { tag: 'Ref', rule: string }
    | { tag: 'Match', index: number }
    | { tag: 'Seq', items: Expr[] }
    | { tag: 'Choice', items: WeightedExpr[] }
    | { tag: 'Quantifier', expr: Expr, min: number, max: number }

export type WeightedExpr = {
    expr: Expr
    weight: number
}

// Utility functions

export const makeAtom = (value: string): Expr => ({tag: "Atom", value});
export const makeRef = (rule: string): Expr => ({tag: "Ref", rule});
export const makeMatch = (index: number): Expr => ({tag: "Match", index});
export const makeSeq = (items: Expr[]): Expr => ({tag: "Seq", items});

export const makeWeighted = (expr: Expr, weight: number | null): WeightedExpr => ({expr: expr, weight: weight ?? 1.0})
export const makeChoice = (items: Expr[]): Expr => ({tag: "Choice", items: items.map(e => makeWeighted(e, null))});
export const makeWeightedChoice = (items: WeightedExpr[]): Expr => ({tag: "Choice", items: items});
export const makeRange = (expr: Expr, min: number, max: number): Expr => ({
    tag: "Quantifier",
    expr: expr,
    min: min,
    max: max
});
export const makeRule = (name: string, expr: Expr, exclusions: Expr[], rewrites: [Expr, Expr][]): Rule => ({
    name: name,
    expr: expr,
    exclusions: exclusions,
    rewrites: rewrites
})
export const makeGrammar = (root: string, rules: Rule[], useWeights: boolean = true): Grammar => {
    const ruleMap = new Map<string, Rule>()
    for (const r of rules) {
        if (!ruleMap.has(r.name)) ruleMap.set(r.name, r)
    }
    return {rules, ruleMap, root, useWeights}
}

const getExprEdges = (e: Expr): string[] => {
    switch (e.tag) {
        case "Atom":
        case "Match":
            return [];
        case "Ref":
            return [e.rule];
        case "Seq":
            return e.items.flatMap(getExprEdges);
        case "Choice":
            return e.items.flatMap(o => getExprEdges(o.expr));
        case "Quantifier":
            return getExprEdges(e.expr);
    }
}

export const getRuleEdges = (r: Rule): string[] => getExprEdges(r.expr)

// Number of back-references a pattern produces, when its shape fixes it.
const knownMatchCount = (e: Expr): number | null => {
    switch (e.tag) {
        case "Atom":
            return 1
        case "Seq":
            return e.items.length
        default:
            return null
    }
}

// Highest `#n#` index an expression uses, or -1 when it uses none.
const maxMatchIndex = (e: Expr): number => {
    switch (e.tag) {
        case "Match":
            return e.index
        case "Seq":
            return Math.max(-1, ...e.items.map(maxMatchIndex))
        case "Choice":
            return Math.max(-1, ...e.items.map(o => maxMatchIndex(o.expr)))
        case "Quantifier":
            return maxMatchIndex(e.expr)
        default:
            return -1
    }
}

// Returns the offending index if the replacement references a match the pattern cannot produce.
export const findInvalidMatchIndex = (pattern: Expr, replacement: Expr): number | null => {
    const count = knownMatchCount(pattern)
    const max = maxMatchIndex(replacement)
    return count !== null && max >= count ? max : null
}