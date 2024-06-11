export type Grammar = {
    rules: Rule[];
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
export const makeChoice = (items: Expr[]): Expr => ({tag: "Choice", items: items.map(makeWeighted)});
export const makeWeightedChoice = (items: WeightedExpr[]): Expr => ({tag: "Choice", items: items});
export const makeRepeat = (expr: Expr, count: number): Expr => makeRange(expr, count, count)
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
export const makeGrammar = (root: string, rules: Rule[], useWeights: boolean = true): Grammar => ({
    rules: rules,
    root: root,
    useWeights: useWeights,
})