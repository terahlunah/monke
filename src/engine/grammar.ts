export type Grammar = {
    rules: Rule[];
    ruleMap: Map<string, Rule>;
    root: string;
    useWeights: boolean
    repeatRewrites: boolean
    features: GrammarFeature[]
    // Feature name of each value name; value names are unique across the grammar so filters name them alone.
    valueFeature: Map<string, string>
}

export type GrammarFeature = {
    name: string
    values: { name: string, weight: number }[]
}

// Feature name -> the values an item carries for it. A feature missing from the map is neutral for that item.
export type Tags = ReadonlyMap<string, ReadonlySet<string>>

// `Ref<front>` keeps alternatives that carry front, `Ref<!front>` those that do not.
export type Filter = { value: string, negate: boolean }

export type Rule = {
    name: string;
    expr: Expr;
    exclusions: Expr[];
    rewrites: [Expr, Expr][];
    // Config rule id, so feature errors found on the grammar can point at the input at fault.
    id?: string
    tags?: Tags
    // Feature names whose value is picked on entering the rule.
    chooses?: string[]
    // Weight factor applied per earlier expansion of this rule in the word to every alternative that is a `Ref` to it.
    repeat?: number
}

export type Expr =
    | { tag: 'Atom', value: string }
    | { tag: 'Ref', rule: string, filters?: Filter[] }
    | { tag: 'Match', index: number }
    | { tag: 'Seq', items: Expr[] }
    | { tag: 'Choice', items: WeightedExpr[] }
    | { tag: 'Quantifier', expr: Expr, min: number, max: number }
    // Zero-width edge of the text being matched (a rule's output); only valid in rewrite matches and exclusions.
    | { tag: 'Boundary', edge: 'start' | 'end' }

export type WeightedExpr = {
    expr: Expr
    weight: number
    // `x~F`: the weight is multiplied by F for each earlier pick of this alternative in the word.
    repeat?: number
    // Only on a rule's rows (its top-level choice): the values the row carries and its config id.
    tags?: Tags
    id?: string
}

// Utility functions

export const makeAtom = (value: string): Expr => ({tag: "Atom", value});
export const makeRef = (rule: string, filters: Filter[] = []): Expr => filters.length ? {tag: "Ref", rule, filters} : {tag: "Ref", rule};
export const makeMatch = (index: number): Expr => ({tag: "Match", index});
export const makeBoundary = (edge: 'start' | 'end'): Expr => ({tag: "Boundary", edge});
export const makeSeq =(items: Expr[]): Expr => ({tag: "Seq", items});

export const makeWeighted = (expr: Expr, weight: number | null): WeightedExpr => ({expr: expr, weight: weight ?? 1.0})
export const makeChoice = (items: Expr[]): Expr => ({tag: "Choice", items: items.map(e => makeWeighted(e, null))});
export const makeWeightedChoice = (items: WeightedExpr[]): Expr => ({tag: "Choice", items: items});
export const makeRange = (expr: Expr, min: number, max: number): Expr => ({
    tag: "Quantifier",
    expr: expr,
    min: min,
    max: max
});
export const makeRule = (name: string, expr: Expr, exclusions: Expr[], rewrites: [Expr, Expr][], extra: Pick<Rule, "id" | "tags" | "chooses" | "repeat"> = {}): Rule => ({
    name: name,
    expr: expr,
    exclusions: exclusions,
    rewrites: rewrites,
    ...extra,
})
export const makeGrammar = (root: string, rules: Rule[], useWeights: boolean = true, repeatRewrites: boolean = false, features: GrammarFeature[] = []): Grammar => {
    const ruleMap = new Map<string, Rule>()
    for (const r of rules) {
        if (!ruleMap.has(r.name)) ruleMap.set(r.name, r)
    }
    const valueFeature = new Map(features.flatMap(f => f.values.map(v => [v.name, f.name] as const)))
    return {rules, ruleMap, root, useWeights, repeatRewrites, features, valueFeature}
}

const getExprEdges = (e: Expr): string[] => {
    switch (e.tag) {
        case "Atom":
        case "Match":
        case "Boundary":
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

// In a match pattern, `#n#` repeats the text of part n of the top-level sequence, so it must sit in a later part.
// Returns the first index that breaks this, or null.
export const findInvalidBackReference = (pattern: Expr): number | null => {
    if (pattern.tag !== "Seq") {
        const max = maxMatchIndex(pattern)
        return max >= 0 ? max : null
    }
    for (const [i, item] of pattern.items.entries()) {
        const max = maxMatchIndex(item)
        if (max >= i) return max
    }
    return null
}

export const containsBoundary =(e: Expr): boolean => {
    switch (e.tag) {
        case "Boundary":
            return true
        case "Seq":
            return e.items.some(containsBoundary)
        case "Choice":
            return e.items.some(o => containsBoundary(o.expr))
        case "Quantifier":
            return containsBoundary(e.expr)
        default:
            return false
    }
}

// Returns the offending index if the replacement references a match the pattern cannot produce.
export const findInvalidMatchIndex = (pattern: Expr, replacement: Expr): number | null => {
    const count = knownMatchCount(pattern)
    const max = maxMatchIndex(replacement)
    return count !== null && max >= count ? max : null
}