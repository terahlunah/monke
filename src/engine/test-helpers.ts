import {Config, Rule} from "./config.ts"
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
    ...extra,
})

export const makeGrammar = (root: string, rules: Rule[], extra: Partial<Config> = {}) =>
    configToGrammar(makeConfig(root, rules, extra))!

// Deterministic RNG so sampled tests are reproducible.
export const mulberry32 = (seed: number): (() => number) => {
    let a = seed
    return () => {
        a = (a + 0x6D2B79F5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Replays a fixed sequence of values (cycling) for exact picks.
export const sequenceRng = (...values: number[]): (() => number) => {
    let i = 0
    return () => values[i++ % values.length]
}
