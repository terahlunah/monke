import {Expr, Filter, Grammar, GrammarFeature, Rule, WeightedExpr} from "./grammar.ts";

// Config location of an item, for errors found on the grammar.
export type Origin = { ownerId?: string, itemId?: string }

// What filters and choices above a spot allow for one feature. Rules classified by the feature keep the rows that
// carry an allowed value; a row without a value of it ("none of the values") stays unless a positive filter applies.
// Filters only ever narrow `allowed`; a choice sets `chosen` (a nested choice replaces it, among the values the
// filters still allow), so the values a row may carry are `allowed` ∩ {chosen}.
export type Constraint = {
    // Values the filters still allow; absent means all of them.
    allowed?: ReadonlySet<string>
    // A positive filter (`<a>`) applies: rows without an allowed value are removed, untagged ones included.
    strict: boolean
    chosen?: string
    // Last filter or choice that narrowed it, so a dead end can point at it.
    origin?: Origin
}

// Feature name -> its constraint. Features missing from the scope are unconstrained.
export type Scope = ReadonlyMap<string, Constraint>

export const emptyScope: Scope = new Map()

// Item ids standing for a rule's chooses and features controls, so errors on them can be located like a row's.
export const RULE_CHOOSES_ITEM = "rule-chooses"
export const RULE_CLASSIFIES_ITEM = "rule-classifies"

// A problem found on the grammar, located by config ids: a rule (and item), or a feature (and value).
export class FeatureProblem extends Error {
    constructor(message: string, readonly ownerId: string | undefined, readonly itemId?: string) {
        super(message)
    }
}

const allows = (c: Constraint, value: string): boolean =>
    (!c.allowed || c.allowed.has(value)) && (c.chosen === undefined || c.chosen === value)

// A row carrying several values of the feature counts as each of them.
const rowKept = (values: ReadonlySet<string> | undefined, c: Constraint): boolean =>
    values?.size ? [...values].some(v => allows(c, v)) : !c.strict

// The rule's rows: its top-level choice, or the whole expression as one untagged alternative.
export const ruleAlternatives = (r: Rule): WeightedExpr[] =>
    r.expr.tag === "Choice" ? r.expr.items : [{expr: r.expr, weight: 1}]

const rowsUnder = (r: Rule, scope: Scope, features: string[]): WeightedExpr[] =>
    features.length === 0 ? ruleAlternatives(r) :
        ruleAlternatives(r).filter(alt => features.every(f => rowKept(alt.tags?.get(f), scope.get(f)!)))

const constrained = (r: Rule, scope: Scope): string[] =>
    scope.size === 0 ? [] : (r.classifies ?? []).filter(f => scope.has(f))

// Rows of `r` that may be produced under `scope` (already including r's own choices). Only the features the rule
// is classified by act on it; for the others it passes through.
export const eligibleRows = (r: Rule, scope: Scope): WeightedExpr[] => rowsUnder(r, scope, constrained(r, scope))

// Adds the filters of a reference (`Ref<a, !b>`) to the scope. Positive values of one feature are a union, and make
// the constraint strict; negative ones remove values. Each feature is narrowed independently, so filters on
// different features intersect.
export const withFilters = (g: Grammar, scope: Scope, filters: Filter[] | undefined, origin?: Origin): Scope => {
    if (!filters?.length) return scope
    const next = new Map(scope)
    const byFeature = new Map<string, Filter[]>()
    for (const f of filters) {
        const feature = g.valueFeature.get(f.value)
        if (feature !== undefined) byFeature.set(feature, [...byFeature.get(feature) ?? [], f])
    }
    for (const [feature, fs] of byFeature) {
        const c = next.get(feature) ?? {strict: false}
        const all = g.features.find(d => d.name === feature)?.values.map(v => v.name) ?? []
        const positive = new Set(fs.filter(f => !f.negate).map(f => f.value))
        const negative = new Set(fs.filter(f => f.negate).map(f => f.value))
        const allowed = [...c.allowed ?? all].filter(v => (positive.size === 0 || positive.has(v)) && !negative.has(v))
        next.set(feature, {...c, allowed: new Set(allowed), strict: c.strict || positive.size > 0, origin})
    }
    return next
}

const valuesLeft = (feature: GrammarFeature, c: Constraint | undefined) =>
    feature.values.filter(v => !c?.allowed || c.allowed.has(v.name))

const noValueLeftMessage = (r: Rule, feature: string) =>
    `Rule '${r.name}' chooses ${feature}, but the filters above it leave no value of ${feature} to choose`

export const chooseOrigin = (r: Rule): Origin => ({ownerId: r.id, itemId: RULE_CHOOSES_ITEM})

// Picks a value of each feature the rule chooses with `pick` (null: draw nothing for that feature).
export const chooseValues = (g: Grammar, r: Rule, scope: Scope, pick: (values: { name: string, weight: number }[]) => string | null): Scope => {
    if (!r.chooses?.length) return scope
    const inner = new Map(scope)
    for (const name of r.chooses) {
        const feature = g.features.find(f => f.name === name)
        if (!feature) continue
        const c = inner.get(name)
        const values = valuesLeft(feature, c)
        if (values.length === 0) throw new FeatureProblem(noValueLeftMessage(r, name), r.id, RULE_CHOOSES_ITEM)
        const value = pick(values)
        if (value !== null) inner.set(name, {...c ?? {strict: false}, chosen: value, origin: chooseOrigin(r)})
    }
    return inner
}

// Every scope the rule can generate its subtree in, with the probability weight of each (product of value weights).
export const scopeOptions = (g: Grammar, r: Rule, scope: Scope): [Scope, number][] => {
    if (!r.chooses?.length) return [[scope, 1]]
    let options: [Scope, number][] = [[scope, 1]]
    for (const name of r.chooses) {
        const feature = g.features.find(f => f.name === name)
        if (!feature) continue
        options = options.flatMap(([s, w]) => {
            const c = s.get(name)
            const values = valuesLeft(feature, c)
            if (values.length === 0) throw new FeatureProblem(noValueLeftMessage(r, name), r.id, RULE_CHOOSES_ITEM)
            return values.map((v): [Scope, number] =>
                [new Map(s).set(name, {...c ?? {strict: false}, chosen: v.name, origin: chooseOrigin(r)}), w * (g.useWeights ? v.weight : 1)])
        })
    }
    return options
}

// Stable text of a scope, for memo and visited-state keys.
export const scopeKey = (scope: Scope): string =>
    [...scope].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([f, c]) => `${f}=${c.allowed ? [...c.allowed].sort().join("+") : "*"}${c.strict ? "!" : ""}${c.chosen !== undefined ? "@" + c.chosen : ""}`)
        .join(",")

const describeConstraint = (g: Grammar, feature: string, c: Constraint): string => {
    const all = g.features.find(f => f.name === feature)?.values.map(v => v.name) ?? []
    const filtered = all.filter(v => !c.allowed || c.allowed.has(v))
    const parts = c.chosen !== undefined ? [`is ${c.chosen}`] : []
    if (c.strict) parts.push(`must be ${filtered.join(" or ") || "nothing"}`)
    else if (filtered.length < all.length && (c.chosen === undefined || !filtered.includes(c.chosen))) {
        parts.push(`is not ${all.filter(v => !filtered.includes(v)).join(" or ")}`)
    }
    return `${feature} ${parts.join(" and ")}`
}

export const deadEndMessage = (g: Grammar, r: Rule, scope: Scope): string => {
    const why = constrained(r, scope).map(f => describeConstraint(g, f, scope.get(f)!)).join(" and ")
    return `No row of rule '${r.name}' can be used when ${why}`
}

// The filter or choice to blame: one whose constraint alone empties the rule, else the first one.
const deadEndOrigin = (r: Rule, scope: Scope): Origin => {
    const features = constrained(r, scope)
    const culprit = features.find(f => rowsUnder(r, scope, features.filter(o => o !== f)).length > 0) ?? features[0]
    return scope.get(culprit)?.origin ?? {ownerId: r.id}
}

const unchosenMessage = (feature: string, r: Rule, parent: string | undefined): string =>
    `Feature '${feature}' is neither chosen nor filtered when rule '${r.name}' is used ${parent ? `in '${parent}'` : "as the start rule"}; all its rows are kept`

export type FeatureWarning = { message: string, ownerId?: string, itemId?: string }

const STATE_LIMIT = 100_000

type Site = Origin & { parent?: string }

// Visits every rule reachable from a starting point under every combination of chosen values, throwing a located
// FeatureProblem at the first rule left without a row. With `warn`, reports rules classified by a feature reached
// where nothing constrains it.
const makeWalker = (g: Grammar, warn?: (w: FeatureWarning) => void) => {
    const seen = new Set<string>()

    const visitRule = (r: Rule, scope: Scope, site: Site) => {
        const key = `${r.name}|${scopeKey(scope)}|${warn ? site.parent ?? "" : ""}`
        if (seen.has(key) || seen.size > STATE_LIMIT) return
        seen.add(key)

        for (const [inner] of scopeOptions(g, r, scope)) {
            const rows = eligibleRows(r, inner)
            if (rows.length === 0 && ruleAlternatives(r).length !== 0) {
                const origin = deadEndOrigin(r, inner)
                throw new FeatureProblem(deadEndMessage(g, r, inner), origin.ownerId, origin.itemId)
            }
            for (const f of warn ? r.classifies ?? [] : []) {
                if (!inner.has(f)) warn!({message: unchosenMessage(f, r, site.parent), ownerId: r.id, itemId: RULE_CLASSIFIES_ITEM})
            }
            for (const row of rows) walk(row.expr, inner, {ownerId: r.id, itemId: row.id, parent: r.name})
            for (const [, replace] of r.rewrites) walk(replace, inner, {ownerId: r.id, parent: r.name})
        }
    }

    const walk = (e: Expr, scope: Scope, site: Site) => {
        switch (e.tag) {
            case "Ref": {
                const target = g.ruleMap.get(e.rule)
                if (target) visitRule(target, withFilters(g, scope, e.filters, site), site)
                return
            }
            case "Seq":
                for (const item of e.items) walk(item, scope, site)
                return
            case "Quantifier":
                if (e.max > 0) walk(e.expr, scope, site)
                return
            case "Choice":
                for (const alt of e.items) walk(alt.expr, scope, site)
                return
            default:
                return
        }
    }

    return visitRule
}

// Walks the grammar from the root. Throws at the first dead end; returns a warning for each rule reached where a
// feature it is classified by is neither chosen nor filtered (deduped).
export const checkFeatures = (g: Grammar): FeatureWarning[] => {
    const root = g.ruleMap.get(g.root)
    if (!root || g.features.length === 0) return []
    const warnings = new Map<string, FeatureWarning>()
    const visit = makeWalker(g, w => {
        const key = `${w.message}|${w.ownerId}|${w.itemId}`
        if (!warnings.has(key)) warnings.set(key, w)
    })
    visit(root, emptyScope, {ownerId: root.id})
    return [...warnings.values()]
}

const exprRefs = (e: Expr): string[] => {
    switch (e.tag) {
        case "Ref":
            return [e.rule]
        case "Seq":
            return e.items.flatMap(exprRefs)
        case "Choice":
            return e.items.flatMap(i => exprRefs(i.expr))
        case "Quantifier":
            return exprRefs(e.expr)
        default:
            return []
    }
}

// The rule and every rule its rows and rewrite replacements reach.
const rulesBelow = (g: Grammar, start: Rule): Rule[] => {
    const seen = new Set<string>()
    const out: Rule[] = []
    const stack = [start.name]
    while (stack.length) {
        const name = stack.pop()!
        if (seen.has(name)) continue
        seen.add(name)
        const r = g.ruleMap.get(name)
        if (!r) continue
        out.push(r)
        stack.push(...exprRefs(r.expr), ...r.rewrites.flatMap(([, rep]) => exprRefs(rep)))
    }
    return out
}

// Every filter in a pattern names a declared value, acts on some rule below the reference, and leaves every rule
// it reaches at least one row.
export const checkFilters = (g: Grammar, e: Expr) => {
    switch (e.tag) {
        case "Ref": {
            if (!e.filters) return
            for (const f of e.filters) {
                if (!g.valueFeature.has(f.value)) throw new Error(`Unknown feature value '${f.value}' in the filter on '${e.rule}'`)
            }
            const target = g.ruleMap.get(e.rule)
            if (!target) return
            const below = rulesBelow(g, target)
            for (const f of e.filters) {
                const feature = g.valueFeature.get(f.value)!
                if (!below.some(r => r.classifies?.includes(feature))) {
                    throw new Error(`The filter ${f.negate ? "!" : ""}${f.value} on '${e.rule}' has no effect: no rule it reaches is classified by ${feature}`)
                }
            }
            makeWalker(g)(target, withFilters(g, emptyScope, e.filters), {})
            return
        }
        case "Seq":
            e.items.forEach(i => checkFilters(g, i))
            return
        case "Choice":
            e.items.forEach(i => checkFilters(g, i.expr))
            return
        case "Quantifier":
            checkFilters(g, e.expr)
            return
        default:
            return
    }
}

const filtersIn = (e: Expr): Filter[] => {
    switch (e.tag) {
        case "Ref":
            return e.filters ?? []
        case "Seq":
            return e.items.flatMap(filtersIn)
        case "Choice":
            return e.items.flatMap(i => filtersIn(i.expr))
        case "Quantifier":
            return filtersIn(e.expr)
        default:
            return []
    }
}

const carries = (r: Rule, feature: string): boolean =>
    ruleAlternatives(r).some(a => a.tags?.get(feature)?.size)

// Non-blocking hints: a declared feature nothing uses, a rule classified by a feature none of its rows carries,
// a choice nothing below the rule is classified by, and rules reached where their features are unconstrained.
export const featureWarnings = (g: Grammar, featureIds: Map<string, string> = new Map()): FeatureWarning[] => {
    const warnings: FeatureWarning[] = []
    const allExprs = g.rules.flatMap(r => [r.expr, ...r.exclusions, ...r.rewrites.flat()])
    const filtered = new Set(allExprs.flatMap(filtersIn).map(f => g.valueFeature.get(f.value)))

    for (const f of g.features) {
        const used = filtered.has(f.name) || g.rules.some(r => r.chooses?.includes(f.name) || r.classifies?.includes(f.name))
        if (!used) warnings.push({message: `Feature '${f.name}' is not used by any rule`, ownerId: featureIds.get(f.name)})
    }

    for (const r of g.rules) {
        for (const f of r.classifies ?? []) {
            if (!carries(r, f)) warnings.push({message: `Rule '${r.name}' is classified by ${f}, but none of its rows carries a ${f} value`, ownerId: r.id, itemId: RULE_CLASSIFIES_ITEM})
        }
        if (!r.chooses?.length) continue
        const below = rulesBelow(g, r)
        for (const f of r.chooses) {
            if (!below.some(b => b.classifies?.includes(f))) warnings.push({message: `Rule '${r.name}' chooses ${f}, but no rule it produces is classified by ${f}`, ownerId: r.id, itemId: RULE_CHOOSES_ITEM})
        }
    }
    try {
        warnings.push(...checkFeatures(g))
    } catch {
        // A dead end is reported as an error by configToGrammar; a grammar built there never has one.
    }
    return warnings
}
