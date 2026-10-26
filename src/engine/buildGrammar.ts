import {Config, Rule as ConfigRule, RulePattern} from "./config.ts";
import {Expr, findInvalidMatchIndex, getRuleEdges, Grammar, makeAtom, makeGrammar, makeRule, makeWeighted, makeWeightedChoice, Rule} from "./grammar.ts";
import {parsePattern} from "./pattern.ts";

export const configToGrammar = (config: Config): Grammar | null => {
    if (!config.root) return null

    const rules = config.rules.map(configRuleToGrammarRule)

    const rulesNames = rules.map(r => r.name)
    for (const rule of rules) {
        const edges = getRuleEdges(rule)

        for (const e of edges) {
            if (!rulesNames.includes(e)) {
                throw new Error(`Unknown rule '${e}' (rule : '${rule.name}')`)
            }
        }
    }

    return makeGrammar(config.root, rules, config.enableWeights)
}

const configRuleToGrammarRule = (rule: ConfigRule): Rule => {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(rule.name)) {
        throw new Error(`Invalid rule name : '${rule.name}'`);
    }

    if (rule.terminalOnly) {
        const ruleExpr = terminalPatternsToExpr(rule.patterns)
        return makeRule(rule.name, ruleExpr, [], [])
    }

    if (rule.patterns.length === 0) {
        throw new Error(`Rule '${rule.name}' is empty`)
    }

    const ruleExpr = rulePatternsToExpr(rule.name, rule.patterns)

    // Hidden sections are kept in the config but must not affect generation.
    const exclusions = rule.showExclusions ? rule.exclusions.map(p => parsePattern(rule.name, p.match)) : []
    const rewrites: [Expr, Expr][] = rule.showRewrites ? rule.rewrites.map(p => {
        const match = parsePattern(rule.name, p.match)
        const replace = parsePattern(rule.name, p.replace)
        const invalid = findInvalidMatchIndex(match, replace)
        if (invalid !== null) {
            throw new Error(`Match #${invalid}# is out of range (rule : '${rule.name}')`)
        }
        return [match, replace]
    }) : []
    return makeRule(rule.name, ruleExpr, exclusions, rewrites)
}

const terminalPatternsToExpr = (patterns: RulePattern[]): Expr =>
    makeWeightedChoice(patterns.map(p => makeWeighted(makeAtom(p.pattern), p.weight)))

const rulePatternsToExpr = (ruleName: string, patterns: RulePattern[]): Expr =>
    makeWeightedChoice(patterns.map(p => makeWeighted(parsePattern(ruleName, p.pattern), p.weight)))
