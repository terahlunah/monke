import {Config} from "./models/config.ts"
import {Rule} from "./models/ui.ts"
import {configToGrammar} from "./logic/parser.ts"

export const makeRule = (name: string, patterns: string[], extra: Partial<Rule> = {}): Rule => ({
    id: name,
    name,
    patterns: patterns.map((pattern, i) => ({id: `${name}${i}`, pattern, weight: 1})),
    rewrites: [],
    exclusions: [],
    terminalOnly: false,
    showRewrites: false,
    showExclusions: false,
    collapsed: false,
    ...extra,
})

export const makeConfig = (root: string, rules: Rule[], extra: Partial<Config> = {}): Config => ({
    language: "test",
    root,
    rules,
    enableWeights: false,
    enableSerif: false,
    ...extra,
})

export const makeGrammar = (root: string, rules: Rule[], extra: Partial<Config> = {}) =>
    configToGrammar(makeConfig(root, rules, extra))!
