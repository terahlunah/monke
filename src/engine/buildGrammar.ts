import {Config, Rule as ConfigRule, RulePattern} from "./config.ts";
import {checkFeatures, checkFilters, FeatureProblem, RULE_CHOOSES_ITEM} from "./features.ts";
import {containsBoundary, Expr, findInvalidBackReference, findInvalidMatchIndex, getRuleEdges, Grammar, GrammarFeature, makeAtom, makeGrammar, makeRule, makeWeighted, makeWeightedChoice, Rule, Tags, WeightedExpr} from "./grammar.ts";
import {parsePattern} from "./pattern.ts";
import {closest} from "./suggest.ts";

// Locates a grammar problem in the config so the UI can flag the offending input: the pattern/rewrite/exclusion
// when known, otherwise the rule itself. Errors in the feature declarations use the feature id (and value id) instead.
export class GrammarError extends Error {
    constructor(message: string, readonly ruleId: string, readonly itemId?: string) {
        super(message)
    }
}

const locate = <T>(ruleId: string, itemId: string, build: () => T): T => {
    try {
        return build()
    } catch (e) {
        throw new GrammarError((e as Error).message, ruleId, itemId)
    }
}

const NAME = /^[A-Za-z_][A-Za-z_0-9]*$/

// Value id -> [feature name, value name], for turning the ids items carry into the names the engine uses.
type ValueNames = Map<string, [string, string]>

const featureDeclarations = (config: Config): { features: GrammarFeature[], valueNames: ValueNames, featureNames: Map<string, string> } => {
    const featureNames = new Map<string, string>()
    const valueNames: ValueNames = new Map()
    const seenFeatures = new Set<string>()
    const seenValues = new Set<string>()
    for (const f of config.features) {
        if (!NAME.test(f.name)) throw new GrammarError(`Invalid feature name : '${f.name}'`, f.id)
        if (seenFeatures.has(f.name)) throw new GrammarError(`Duplicate feature name '${f.name}'`, f.id)
        seenFeatures.add(f.name)
        featureNames.set(f.id, f.name)
        for (const v of f.values) {
            if (!NAME.test(v.name)) throw new GrammarError(`Invalid value name : '${v.name}' (feature : '${f.name}')`, f.id, v.id)
            // Filters name a value on its own, so a name must point at one feature.
            if (seenValues.has(v.name)) throw new GrammarError(`Duplicate value name '${v.name}': value names must be unique across features`, f.id, v.id)
            seenValues.add(v.name)
            valueNames.set(v.id, [f.name, v.name])
        }
    }
    const features = config.features.map(f => ({name: f.name, values: f.values.map(v => ({name: v.name, weight: v.weight}))}))
    return {features, valueNames, featureNames}
}

const toTags = (ids: string[] | undefined, valueNames: ValueNames): Tags | undefined => {
    const tags = new Map<string, Set<string>>()
    for (const id of ids ?? []) {
        const names = valueNames.get(id)
        if (!names) continue
        const [feature, value] = names
        tags.set(feature, (tags.get(feature) ?? new Set()).add(value))
    }
    return tags.size ? tags : undefined
}

export const configToGrammar = (config: Config): Grammar | null => {
    if (!config.root) return null

    const {features, valueNames, featureNames} = featureDeclarations(config)
    const rules = config.rules.map(r => configRuleToGrammarRule(r, valueNames, featureNames))

    const rulesNames = rules.map(r => r.name)
    const seen = new Set<string>()
    for (const [i, name] of rulesNames.entries()) {
        if (seen.has(name)) {
            throw new GrammarError(`Duplicate rule name '${name}'`, config.rules[i].id)
        }
        seen.add(name)
    }

    for (const [i, rule] of rules.entries()) {
        const edges = getRuleEdges(rule)

        for (const e of edges) {
            if (!rulesNames.includes(e)) {
                const suggestion = closest(e, rulesNames)
                const hint = suggestion ? `. Did you mean \`${suggestion}\`?` : ""
                throw new GrammarError(`Unknown rule '${e}' (rule : '${rule.name}')${hint}`, config.rules[i].id, patternReferencing(config.rules[i], e))
            }
        }

        for (const f of rule.chooses ?? []) {
            if (features.find(d => d.name === f)?.values.length === 0) {
                throw new GrammarError(`Feature '${f}' has no values to choose from (rule : '${rule.name}')`, config.rules[i].id, RULE_CHOOSES_ITEM)
            }
        }
    }

    const grammar = makeGrammar(config.root, rules, config.enableWeights, config.repeatRewrites, features)

    // Filters can only be checked once every rule and value is known.
    for (const [i, rule] of config.rules.entries()) {
        const built = rules[i]
        const rows = built.expr.tag === "Choice" ? built.expr.items : []
        rows.forEach(row => locate(rule.id, row.id!, () => checkFilters(grammar, row.expr)))
        built.exclusions.forEach((e, n) => locate(rule.id, rule.exclusions[n].id, () => checkFilters(grammar, e)))
        built.rewrites.forEach((pair, n) => pair.forEach(e => locate(rule.id, rule.rewrites[n].id, () => checkFilters(grammar, e))))
    }

    try {
        checkFeatures(grammar)
    } catch (e) {
        if (!(e instanceof FeatureProblem)) throw e
        throw new GrammarError(e.message, e.ownerId ?? config.rules[0]?.id ?? "", e.itemId)
    }

    return grammar
}

// The pattern that uses an unknown name, so the error lands on that input rather than on the whole rule.
const patternReferencing = (rule: ConfigRule, name: string): string | undefined =>
    rule.patterns.find(p => getRuleEdges(makeRule(rule.name, parsePattern(rule.name, p.pattern), [], [])).includes(name))?.id

const configRuleToGrammarRule = (rule: ConfigRule, valueNames: ValueNames, featureNames: Map<string, string>): Rule => {
    if (!NAME.test(rule.name)) {
        throw new GrammarError(`Invalid rule name : '${rule.name}'`, rule.id);
    }

    const extra = {
        id: rule.id,
        tags: toTags(rule.values, valueNames),
        chooses: (rule.chooses ?? []).flatMap(id => featureNames.get(id) ?? []),
    }

    if (rule.terminalOnly) {
        const ruleExpr = terminalPatternsToExpr(rule.patterns, valueNames)
        return makeRule(rule.name, ruleExpr, [], [], extra)
    }

    if (rule.patterns.length === 0) {
        throw new GrammarError(`Rule '${rule.name}' is empty`, rule.id)
    }

    const ruleExpr = rulePatternsToExpr(rule, rule.patterns, valueNames)

    // Hidden sections are kept in the config but must not affect generation.
    const exclusions = rule.showExclusions ? rule.exclusions.map(p => locate(rule.id, p.id, () => parseMatchPattern(rule.name, p.match))) : []
    const rewrites: [Expr, Expr][] = rule.showRewrites ? rule.rewrites.map(p => {
        const match = locate(rule.id, p.id, () => parseMatchPattern(rule.name, p.match))
        const replace = locate(rule.id, p.id, () => noBoundary(rule.name, parsePattern(rule.name, p.replace)))
        const invalid = findInvalidMatchIndex(match, replace)
        if (invalid !== null) {
            throw new GrammarError(`Match #${invalid}# is out of range (rule : '${rule.name}')`, rule.id, p.id)
        }
        return [match, replace]
    }) : []
    return makeRule(rule.name, ruleExpr, exclusions, rewrites, extra)
}

const row = (expr: Expr, p: RulePattern, valueNames: ValueNames): WeightedExpr => {
    const tags = toTags(p.values, valueNames)
    return {...makeWeighted(expr, p.weight), id: p.id, ...tags ? {tags} : {}}
}

const terminalPatternsToExpr = (patterns: RulePattern[], valueNames: ValueNames): Expr =>
    makeWeightedChoice(patterns.map(p => row(makeAtom(p.pattern), p, valueNames)))

const rulePatternsToExpr = (rule: ConfigRule, patterns: RulePattern[], valueNames: ValueNames): Expr =>
    makeWeightedChoice(patterns.map(p => row(locate(rule.id, p.id, () => noBoundary(rule.name, parsePattern(rule.name, p.pattern))), p, valueNames)))

const parseMatchPattern = (ruleName: string, src: string): Expr => {
    const e = parsePattern(ruleName, src)
    const invalid = findInvalidBackReference(e)
    if (invalid !== null) {
        throw new Error(`Match #${invalid}# must refer to an earlier part of the pattern (rule : '${ruleName}')`)
    }
    return e
}

// Boundaries only make sense when matching existing text, not when producing it.
const noBoundary = (ruleName: string, e: Expr): Expr => {
    if (containsBoundary(e)) {
        throw new Error(`Word boundaries ^ and $ are only allowed in rewrite matches and exclusions (rule : '${ruleName}')`)
    }
    return e
}
