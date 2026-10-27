import {Config, Feature, Rule} from "./config.ts"
import {configToGrammar} from "./buildGrammar.ts"

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
    repeatRewrites: false,
    seed: "",
    features: [],
    ...extra,
})

export const makeGrammar = (root: string, rules: Rule[], extra: Partial<Config> = {}) =>
    configToGrammar(makeConfig(root, rules, extra))!

// Deterministic RNG so sampled tests are reproducible.
export {mulberry32} from "./seed.ts"

// Replays a fixed sequence of values (cycling) for exact picks.
export const sequenceRng = (...values: number[]): (() => number) => {
    let i = 0
    return () => values[i++ % values.length]
}

// Feature and value ids equal their names in tests, so items can refer to values by name.
export const makeFeature = (name: string, values: (string | [string, number])[]): Feature => ({
    id: name,
    name,
    values: values.map(v => typeof v === "string" ? {id: v, name: v, weight: 1} : {id: v[0], name: v[0], weight: v[1]}),
})

// Gives row i the values in rows[i]; a missing or empty entry leaves the row neutral.
export const tagRows = (rule: Rule, rows: (string[] | undefined)[]): Rule => ({
    ...rule,
    patterns: rule.patterns.map((p, i) => rows[i]?.length ? {...p, values: rows[i]} : p),
})

export const harmony = makeFeature("harmony", ["front", "back"])
export const rounding = makeFeature("rounding", ["round", ["flat", 2]])
// a is neutral, e i front, o u back.
export const vowels = tagRows(makeRule("V", ["a", "e", "i", "o", "u"], {terminalOnly: true}),
    [[], ["front"], ["front"], ["back"], ["back"]])
export const consonants = makeRule("C", ["p", "t", "k"], {terminalOnly: true})

export const harmonyConfig = (word = "[C.V]{2:3}", extra: Partial<Rule> = {chooses: ["harmony"]}, rules: Rule[] = [vowels, consonants], features: Feature[] = [harmony]): Config =>
    makeConfig("Word", [makeRule("Word", [word], extra), ...rules], {features})
