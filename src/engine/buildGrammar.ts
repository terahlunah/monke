import {Config, Rule as ConfigRule, RulePattern} from "./config.ts";
import {containsBoundary, Expr, findInvalidMatchIndex, getRuleEdges, Grammar, makeAtom, makeGrammar, makeRule, makeWeighted, makeWeightedChoice, Rule} from "./grammar.ts";
import {parsePattern} from "./pattern.ts";

// Locates a grammar problem in the config so the UI can flag the offending input: the pattern/rewrite/exclusion
// when known, otherwise the rule itself.
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

export const configToGrammar = (config: Config): Grammar | null => {
    if (!config.root) return null

    const rules = config.rules.map(configRuleToGrammarRule)

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
                throw new GrammarError(`Unknown rule '${e}' (rule : '${rule.name}')`, config.rules[i].id)
            }
        }
    }

    return makeGrammar(config.root, rules, config.enableWeights, config.repeatRewrites)
}

const configRuleToGrammarRule = (rule: ConfigRule): Rule => {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(rule.name)) {
        throw new GrammarError(`Invalid rule name : '${rule.name}'`, rule.id);
    }

    if (rule.terminalOnly) {
        const ruleExpr = terminalPatternsToExpr(rule.patterns)
        return makeRule(rule.name, ruleExpr, [], [])
    }

    if (rule.patterns.length === 0) {
        throw new GrammarError(`Rule '${rule.name}' is empty`, rule.id)
    }

    const ruleExpr = rulePatternsToExpr(rule, rule.patterns)

    // Hidden sections are kept in the config but must not affect generation.
    const exclusions = rule.showExclusions ? rule.exclusions.map(p => locate(rule.id, p.id, () => parsePattern(rule.name, p.match))) : []
    const rewrites: [Expr, Expr][] = rule.showRewrites ? rule.rewrites.map(p => {
        const match = locate(rule.id, p.id, () => parsePattern(rule.name, p.match))
        const replace = locate(rule.id, p.id, () => noBoundary(rule.name, parsePattern(rule.name, p.replace)))
        const invalid = findInvalidMatchIndex(match, replace)
        if (invalid !== null) {
            throw new GrammarError(`Match #${invalid}# is out of range (rule : '${rule.name}')`, rule.id, p.id)
        }
        return [match, replace]
    }) : []
    return makeRule(rule.name, ruleExpr, exclusions, rewrites)
}

const terminalPatternsToExpr = (patterns: RulePattern[]): Expr =>
    makeWeightedChoice(patterns.map(p => makeWeighted(makeAtom(p.pattern), p.weight)))

const rulePatternsToExpr = (rule: ConfigRule, patterns: RulePattern[]): Expr =>
    makeWeightedChoice(patterns.map(p => makeWeighted(locate(rule.id, p.id, () => noBoundary(rule.name, parsePattern(rule.name, p.pattern))), p.weight)))

// Boundaries only make sense when matching existing text, not when producing it.
const noBoundary = (ruleName: string, e: Expr): Expr => {
    if (containsBoundary(e)) {
        throw new Error(`Word boundaries ^ and $ are only allowed in rewrite matches and exclusions (rule : '${ruleName}')`)
    }
    return e
}
