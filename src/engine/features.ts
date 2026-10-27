import {Expr, Filter, Grammar, Rule, Tags, WeightedExpr} from "./grammar.ts";

// Feature name -> the value chosen for it by an enclosing rule.
export type Scope = ReadonlyMap<string, string>

export const emptyScope: Scope = new Map()

// Item ids standing for a rule's own values and chooses controls, so errors on them can be located like a row's.
export const RULE_VALUES_ITEM = "rule-values"
export const RULE_CHOOSES_ITEM = "rule-chooses"

// A problem found on the grammar, located by config ids: a rule (and item), or a feature (and value).
export class FeatureProblem extends Error {
    constructor(message: string, readonly ownerId: string | undefined, readonly itemId?: string) {
        super(message)
    }
}

const noTags: Tags = new Map()

export const mergeTags = (a: Tags | undefined, b: Tags | undefined): Tags => {
    if (!a || a.size === 0) return b ?? noTags
    if (!b || b.size === 0) return a
    const out = new Map<string, Set<string>>()
    for (const t of [a, b]) {
        for (const [f, values] of t) out.set(f, new Set([...out.get(f) ?? [], ...values]))
    }
    return out
}

// A rule referenced directly as an alternative is itself an alternative carrying the rule's values.
export const alternativeTags = (g: Grammar, alt: WeightedExpr): Tags =>
    alt.expr.tag === "Ref" ? mergeTags(alt.tags, g.ruleMap.get(alt.expr.rule)?.tags) : alt.tags ?? noTags

// An item is out of scope when it carries values of a chosen feature but not the chosen one. Untagged is neutral.
export const conflictsWith = (tags: Tags, scope: Scope): boolean => {
    for (const [feature, chosen] of scope) {
        const values = tags.get(feature)
        if (values && !values.has(chosen)) return true
    }
    return false
}

export const passesFilters = (g: Grammar, tags: Tags, filters: Filter[]): boolean =>
    filters.every(f => (tags.get(g.valueFeature.get(f.value) ?? "")?.has(f.value) ?? false) !== f.negate)

// The rule's rows: its top-level choice, or the whole expression as one untagged alternative.
export const ruleAlternatives = (r: Rule): WeightedExpr[] =>
    r.expr.tag === "Choice" ? r.expr.items : [{expr: r.expr, weight: 1}]

// Rows of `r` that may be produced under `scope` (already including r's own choices) through a reference with `filters`.
// The rule's own values count for filters, as if every row carried them; scope checks them on entering the rule.
export const eligibleRows = (g: Grammar, r: Rule, scope: Scope, filters: Filter[] = []): WeightedExpr[] =>
    ruleAlternatives(r).filter(alt => {
        const tags = alternativeTags(g, alt)
        if (conflictsWith(tags, scope)) return false
        return filters.length === 0 || passesFilters(g, mergeTags(r.tags, tags), filters)
    })

// Alternatives of a choice nested inside a pattern: only references to tagged rules can be out of scope there.
export const eligibleNested = (g: Grammar, items: WeightedExpr[], scope: Scope): WeightedExpr[] =>
    scope.size === 0 ? items : items.filter(alt => !conflictsWith(alternativeTags(g, alt), scope))

// Every scope the rule can generate its subtree in, with the probability weight of each (product of value weights).
export const scopeOptions = (g: Grammar, r: Rule, scope: Scope): [Scope, number][] => {
    let options: [Map<string, string>, number][] = [[new Map(scope), 1]]
    for (const name of r.chooses ?? []) {
        const feature = g.features.find(f => f.name === name)
        if (!feature) continue
        options = options.flatMap(([s, w]) => feature.values.map((v): [Map<string, string>, number] =>
            [new Map(s).set(name, v.name), w * (g.useWeights ? v.weight : 1)]))
    }
    return options
}

const describeScope = (scope: Scope): string =>
    [...scope].map(([f, v]) => `${f} is ${v}`).join(" and ")

const describeFilters = (filters: Filter[]): string =>
    `<${filters.map(f => (f.negate ? "!" : "") + f.value).join(", ")}>`

export const deadEndMessage = (r: Rule, scope: Scope, filters: Filter[]): string => {
    const why = [scope.size ? `when ${describeScope(scope)}` : "", filters.length ? `through ${describeFilters(filters)}` : ""]
        .filter(Boolean).join(" ")
    return `No alternative of rule '${r.name}' can be used ${why}`
}

export const outOfScopeMessage = (r: Rule, scope: Scope): string =>
    `Rule '${r.name}' cannot be used when ${describeScope(scope)}: its values exclude it`

// Features carried by an item that nothing chooses (and no filter at that spot selects on): the values are inert
// there, every row stays in play.
const unchosen = (tags: Tags, covered: (feature: string) => boolean): string[] =>
    [...tags.keys()].filter(f => !covered(f))

const unchosenMessage = (feature: string, r: Rule, parent: string | undefined): string =>
    `Feature '${feature}' is not chosen when rule '${r.name}' is used ${parent ? `in '${parent}'` : "as the start rule"}; its values are all kept`

const STATE_LIMIT = 100_000

// Walks every rule reachable from the root under every combination of chosen values. Throws at the first place
// where scope and filters leave nothing to produce; returns a warning for each tagged item reached where its
// feature is not chosen (deduped).
export const checkFeatures = (g: Grammar): FeatureWarning[] => {
    const root = g.ruleMap.get(g.root)
    if (!root || g.features.length === 0) return []
    const seen = new Set<string>()
    const warnings = new Map<string, FeatureWarning>()
    const warn = (w: FeatureWarning) => {
        const key = `${w.message}|${w.ownerId}|${w.itemId}`
        if (!warnings.has(key)) warnings.set(key, w)
    }
    const keyOf = (s: Iterable<unknown>) => [...s].map(String).sort().join(",")
    const featuresOf = (filters: Filter[]) => filters.map(f => g.valueFeature.get(f.value) ?? "")

    // `parent`: name of the rule whose pattern references this one.
    type Site = { ownerId?: string, itemId?: string, parent?: string }

    // `covered`: features a filter selects on at this spot, the reference's own and, for a rule entered as a row,
    // those of the reference to its parent. A filter makes carrying the values meaningful without a choice.
    const visitRule = (r: Rule, scope: Scope, filters: Filter[], covered: Set<string>, site: Site) => {
        const key = `${r.name}|${keyOf(scope)}|${describeFilters(filters)}|${keyOf(covered)}|${site.parent ?? ""}`
        if (seen.has(key) || seen.size > STATE_LIMIT) return
        seen.add(key)

        const cover = new Set([...covered, ...featuresOf(filters)])
        if (r.tags) {
            for (const f of unchosen(r.tags, f => scope.has(f) || cover.has(f))) {
                warn({message: unchosenMessage(f, r, site.parent), ownerId: r.id, itemId: RULE_VALUES_ITEM})
            }
            if (conflictsWith(r.tags, scope)) throw new FeatureProblem(outOfScopeMessage(r, scope), site.ownerId, site.itemId)
        }

        const own = new Set(featuresOf(filters))
        for (const [inner] of scopeOptions(g, r, scope)) {
            const rows = eligibleRows(g, r, inner, filters)
            if (rows.length === 0) {
                throw new FeatureProblem(deadEndMessage(r, inner, filters), filters.length ? site.ownerId : r.id, filters.length ? site.itemId : undefined)
            }
            for (const row of rows) {
                for (const f of row.tags ? unchosen(row.tags, f => inner.has(f) || own.has(f)) : []) {
                    warn({message: unchosenMessage(f, r, site.parent), ownerId: r.id, itemId: row.id})
                }
                const rowSite = {ownerId: r.id, itemId: row.id, parent: r.name}
                if (row.expr.tag === "Ref") {
                    const target = g.ruleMap.get(row.expr.rule)
                    if (target) visitRule(target, inner, row.expr.filters ?? [], own, rowSite)
                } else {
                    walk(row.expr, inner, rowSite)
                }
            }
            for (const [, replace] of r.rewrites) walk(replace, inner, {ownerId: r.id, parent: r.name})
        }
    }

    const walk = (e: Expr, scope: Scope, site: Site) => {
        switch (e.tag) {
            case "Ref": {
                const target = g.ruleMap.get(e.rule)
                if (target) visitRule(target, scope, e.filters ?? [], new Set(), site)
                return
            }
            case "Seq":
                for (const item of e.items) walk(item, scope, site)
                return
            case "Quantifier":
                if (e.max > 0) walk(e.expr, scope, site)
                return
            case "Choice": {
                const items = eligibleNested(g, e.items, scope)
                if (items.length === 0) throw new FeatureProblem(`No alternative of this choice can be used when ${describeScope(scope)}`, site.ownerId, site.itemId)
                for (const alt of items) walk(alt.expr, scope, site)
                return
            }
            default:
                return
        }
    }

    visitRule(root, emptyScope, [], new Set(), {ownerId: root.id})
    return [...warnings.values()]
}

// Every filter in a pattern names a declared value, and the filters alone keep at least one alternative.
export const checkFilters = (g: Grammar, e: Expr) => {
    switch (e.tag) {
        case "Ref": {
            if (!e.filters) return
            for (const f of e.filters) {
                if (!g.valueFeature.has(f.value)) throw new Error(`Unknown feature value '${f.value}' in the filter on '${e.rule}'`)
            }
            const target = g.ruleMap.get(e.rule)
            if (target && eligibleRows(g, target, emptyScope, e.filters).length === 0) {
                throw new Error(deadEndMessage(target, emptyScope, e.filters))
            }
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

export type FeatureWarning = { message: string, ownerId?: string, itemId?: string }

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

// Non-blocking hints: a declared feature nothing uses, a choice nothing below the rule reacts to, and values
// carried where their feature is not chosen.
export const featureWarnings = (g: Grammar, featureIds: Map<string, string> = new Map()): FeatureWarning[] => {
    const warnings: FeatureWarning[] = []
    const allExprs = g.rules.flatMap(r => [r.expr, ...r.exclusions, ...r.rewrites.flat()])
    const filtered = new Set(allExprs.flatMap(filtersIn).map(f => g.valueFeature.get(f.value)))
    const carried = (r: Rule) => [r.tags, ...ruleAlternatives(r).map(a => a.tags)].flatMap(t => t ? [...t.keys()] : [])

    for (const f of g.features) {
        const used = filtered.has(f.name) || g.rules.some(r => r.chooses?.includes(f.name) || carried(r).includes(f.name))
        if (!used) warnings.push({message: `Feature '${f.name}' is not used by any rule`, ownerId: featureIds.get(f.name)})
    }

    for (const r of g.rules) {
        if (!r.chooses?.length) continue
        // Rows of the rule itself and everything it reaches; its own values are decided by whoever references it.
        const below = new Set<string>(ruleAlternatives(r).flatMap(a => a.tags ? [...a.tags.keys()] : []))
        const seen = new Set<string>()
        const stack = [...r.rewrites.map(([, rep]) => rep), r.expr].flatMap(exprRefs)
        while (stack.length) {
            const name = stack.pop()!
            if (seen.has(name)) continue
            seen.add(name)
            const next = g.ruleMap.get(name)
            if (!next) continue
            carried(next).forEach(f => below.add(f))
            stack.push(...exprRefs(next.expr))
        }
        for (const f of r.chooses) {
            if (!below.has(f)) warnings.push({message: `Rule '${r.name}' chooses ${f}, but nothing it produces carries ${f} values`, ownerId: r.id, itemId: RULE_CHOOSES_ITEM})
        }
    }
    try {
        warnings.push(...checkFeatures(g))
    } catch {
        // A dead end is reported as an error by configToGrammar; a grammar built there never has one.
    }
    return warnings
}
