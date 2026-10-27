import {describe, expect, it} from "vitest"
import {enumerate} from "./enumerate.ts"
import {generate} from "./generate.ts"
import {countCombinations} from "./analysis.ts"
import {configToGrammar} from "./buildGrammar.ts"
import {Config} from "./config.ts"
import {consonants, harmony, harmonyConfig, makeFeature, makeRule, mulberry32, rounding, tagRows, vowels} from "./test-helpers.ts"

const build = (config: Config) => configToGrammar(config)!

// Generate all must list exactly the words generation reaches.
const expectMatchesGenerator = (config: Config, samples = 6000) => {
    const g = build(config)
    const rng = mulberry32(11)
    const seen = new Set(Array.from({length: samples}, () => generate(g, rng)))
    expect(enumerate(g).words.slice().sort()).toEqual([...seen].sort())
}

const front = makeRule("F", ["e", "i"], {terminalOnly: true, values: ["front"]})
const back = makeRule("B", ["o", "u"], {terminalOnly: true, values: ["back"]})
const twoFeatureVowels = tagRows(makeRule("V", ["a", "e", "o", "y"], {terminalOnly: true}),
    [["flat"], ["front", "flat"], ["back", "round"], ["front", "round"]])

const cases: [string, Config][] = [
    ["harmony", harmonyConfig("C.V.V")],
    ["nested re-choose", harmonyConfig("V.'-'.Inner", {chooses: ["harmony"]}, [makeRule("Inner", ["V{2}"], {chooses: ["harmony"]}), vowels])],
    ["rule-level values as alternatives", harmonyConfig("[F / B / 'a']{2}", {chooses: ["harmony"]}, [front, back])],
    ["two features", harmonyConfig("V{2}", {chooses: ["harmony", "rounding"]}, [twoFeatureVowels], [harmony, rounding])],
    ["filters only", harmonyConfig("C.V<!back>.V<front>", {})],
    ["filters with a choice", harmonyConfig("V.V<!front>", {chooses: ["harmony"]})],
    ["rewrites in scope", harmonyConfig("V{2}", {chooses: ["harmony"], showRewrites: true, rewrites: [{id: "r", match: "'a'", replace: "V<!front>"}]})],
    ["exclusions", harmonyConfig("V{2}", {chooses: ["harmony"], showExclusions: true, exclusions: [{id: "x", match: "V<back>.V<back>"}]})],
]

describe("enumeration with features", () => {
    it.each(cases)("lists exactly the generated words: %s", (_, config) => {
        expectMatchesGenerator(config)
    })

    it("lists each word once even when several values reach it", () => {
        expect(enumerate(build(harmonyConfig("C.V"))).words).toHaveLength(15)
    })

    it("skips values that weights never pick", () => {
        const never = [makeFeature("harmony", ["front", ["back", 0]])]
        const config = {...harmonyConfig("V{2}", {chooses: ["harmony"]}, [vowels], never), enableWeights: true}
        expect(enumerate(build(config)).words.some(w => /[ou]/.test(w))).toBe(false)
    })
})

describe("counting with features", () => {
    it("sums the derivations over every chosen value", () => {
        // front: 3 consonants x {a, e, i}; back: 3 x {a, o, u}.
        expect(countCombinations(build(harmonyConfig("C.V")))).toBe(18)
    })

    it("multiplies nested choices and honours filters", () => {
        expect(countCombinations(build(harmonyConfig("C.V<!back>", {})))).toBe(9)
        expect(countCombinations(build(harmonyConfig("V.V<!front>", {chooses: ["harmony"]})))).toBe(3 * 1 + 3 * 3)
        expect(countCombinations(build(harmonyConfig("V{2}", {chooses: ["harmony", "rounding"]}, [twoFeatureVowels], [harmony, rounding]))))
            // front+flat {a,e}, front+round {y}, back+flat {a}, back+round {o}
            .toBe(4 + 1 + 1 + 1)
    })

    it("is never below the number of distinct words", () => {
        for (const [, config] of cases.slice(0, 5)) {
            const g = build(config)
            expect(countCombinations(g)).toBeGreaterThanOrEqual(enumerate(g).words.length)
        }
    })

    it("keeps counting grammars without features as before", () => {
        expect(countCombinations(build(harmonyConfig("C.C", {}, [consonants], [])))).toBe(9)
    })
})
