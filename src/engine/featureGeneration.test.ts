import {describe, expect, it} from "vitest"
import {generate} from "./generate.ts"
import {configToGrammar} from "./buildGrammar.ts"
import {Config} from "./config.ts"
import {tokiPonaRoot, tokiPonaRules} from "./defaults.ts"
import {makeAtom, makeGrammar as makeRawGrammar, makeRef, makeRule as makeRawRule, makeWeightedChoice} from "./grammar.ts"
import {consonants, harmony, harmonyConfig, makeConfig, makeFeature, makeRule, mulberry32, rounding, tagRows, vowels} from "./test-helpers.ts"

const sample = (config: Config, n = 1000, seed = 1) => {
    const g = configToGrammar(config)!
    const rng = mulberry32(seed)
    return Array.from({length: n}, () => generate(g, rng))
}

const mixes = (word: string) => /[ei]/.test(word) && /[ou]/.test(word)

describe("generation with a chosen feature", () => {
    it("never mixes front and back vowels in a word that chooses harmony", () => {
        const words = sample(harmonyConfig(), 2000)
        expect(words.filter(mixes)).toEqual([])
        // Both values and the neutral vowel occur.
        expect(words.some(w => /[ei]/.test(w))).toBe(true)
        expect(words.some(w => /[ou]/.test(w))).toBe(true)
        expect(words.some(w => /a/.test(w) && /[ei]/.test(w))).toBe(true)
        expect(words.some(w => /a/.test(w) && /[ou]/.test(w))).toBe(true)
    })

    it("holds across seeds", () => {
        for (let seed = 2; seed < 12; seed++) expect(sample(harmonyConfig(), 200, seed).filter(mixes)).toEqual([])
    })

    it("mixes freely without features, as a control", () => {
        const plain = makeConfig("Word", [makeRule("Word", ["[C.V]{2:3}"]), makeRule("V", ["a", "e", "i", "o", "u"], {terminalOnly: true}), consonants])
        expect(sample(plain).some(mixes)).toBe(true)
    })

    it("weights the chosen values when weights are on, and picks them uniformly when off", () => {
        const skewed = [makeFeature("harmony", [["front", 9], ["back", 1]])]
        const config = harmonyConfig("V{3}", {chooses: ["harmony"]}, [tagRows(makeRule("V", ["e", "o"], {terminalOnly: true}), [["front"], ["back"]])], skewed)
        const share = (c: Config) => sample(c, 2000).filter(w => w.includes("e")).length / 2000
        expect(share({...config, enableWeights: true})).toBeGreaterThan(0.85)
        expect(share(config)).toBeGreaterThan(0.4)
        expect(share(config)).toBeLessThan(0.6)
    })

    it("lets an inner rule choose again for its own subtree", () => {
        const inner = makeRule("Inner", ["[C.V]{2}"], {chooses: ["harmony"]})
        const words = sample(harmonyConfig("[C.V]{2}.'-'.Inner", {chooses: ["harmony"]}, [inner, vowels, consonants]), 2000)
        const halves = words.map(w => w.split("-"))
        expect(halves.flat().filter(mixes)).toEqual([])
        // The halves choose independently, so some words differ between them.
        expect(halves.some(([a, b]) => /[ei]/.test(a) && /[ou]/.test(b))).toBe(true)
    })

    it("keeps an untagged inner rule in the enclosing scope", () => {
        const syllable = makeRule("S", ["C.V"])
        expect(sample(harmonyConfig("S{3}", {chooses: ["harmony"]}, [syllable, vowels, consonants])).filter(mixes)).toEqual([])
    })

    it("removes tagged rules referenced as alternatives, at any choice", () => {
        const front = makeRule("F", ["e", "i"], {terminalOnly: true, values: ["front"]})
        const back = makeRule("B", ["o", "u"], {terminalOnly: true, values: ["back"]})
        const rows = makeRule("V", ["F", "B", "'a'"])
        expect(sample(harmonyConfig("[C.V]{3}", {chooses: ["harmony"]}, [rows, front, back, consonants])).filter(mixes)).toEqual([])
        expect(sample(harmonyConfig("[C.[F / B]]{3}", {chooses: ["harmony"]}, [front, back, consonants])).filter(mixes)).toEqual([])
    })

    it("branches pattern rows on a chosen feature", () => {
        const wordClass = makeFeature("class", [["noun", 2], ["verb", 1]])
        const root = tagRows(makeRule("Root", ["ka", "ti", "mo"], {terminalOnly: true}), [["noun"], ["verb"]])
        const end = tagRows(makeRule("End", ["'-n'", "'-t'"]), [["noun"], ["verb"]])
        const words = new Set(sample(harmonyConfig("Root.End", {chooses: ["class"]}, [root, end], [wordClass])))
        expect([...words].sort()).toEqual(["ka-n", "mo-n", "mo-t", "ti-t"])
    })

    it("combines two features, an item carrying values of both", () => {
        const v = tagRows(makeRule("V", ["a", "e", "i", "o", "u", "y"], {terminalOnly: true}),
            [["flat"], ["front", "flat"], ["front", "flat"], ["back", "round"], ["back", "round"], ["front", "round"]])
        const words = sample(harmonyConfig("[C.V]{3}", {chooses: ["harmony", "rounding"]}, [v, consonants], [harmony, rounding]), 2000)
        expect(words.filter(mixes)).toEqual([])
        expect(words.filter(w => /[aei]/.test(w) && /[ouy]/.test(w))).toEqual([])
        expect(new Set(words.flatMap(w => w.split("").filter(c => "aeiouy".includes(c))))).toEqual(new Set("aeiouy"))
    })

    it("counts an item tagged with two values of one feature as a member of each", () => {
        const v = tagRows(makeRule("V", ["e", "o", "y"], {terminalOnly: true}), [["front"], ["back"], ["front", "back"]])
        const words = sample(harmonyConfig("V{3}", {chooses: ["harmony"]}, [v]))
        expect(words.filter(mixes)).toEqual([])
        expect(words.some(w => w.includes("y") && w.includes("e"))).toBe(true)
        expect(words.some(w => w.includes("y") && w.includes("o"))).toBe(true)
    })

    it("chooses again on each exclusion retry, so a banned value does not exhaust the retries", () => {
        const config = harmonyConfig("C.V", {chooses: ["harmony"], showExclusions: true, exclusions: [{id: "x", match: "'o' / 'u'"}]})
        expect(sample(config).filter(w => /[ou]/.test(w))).toEqual([])
    })

    it("draws the same words as before for grammars without features", () => {
        const plain = makeConfig("W", [makeRule("W", ["C.V.C"]), consonants, makeRule("V", ["a", "i"], {terminalOnly: true})])
        // Recorded before features existed.
        expect(sample(plain, 5)).toEqual(["pik", "pik", "kat", "tap", "pak"])
        expect(sample(makeConfig(tokiPonaRoot, tokiPonaRules, {enableWeights: true}), 8, 3))
            .toEqual(["mate", "lilewin", "jonsomu", "i", "uno", "lonlopa", "menson", "o"])
    })
})

describe("filters in generation", () => {
    it("keeps members with <value> and non-members, neutral included, with <!value>", () => {
        const only = (pattern: string) => new Set(sample(harmonyConfig(pattern, {})).flatMap(w => w.split("")))
        expect(only("V<front>")).toEqual(new Set("ei"))
        expect(only("V<!back>")).toEqual(new Set("aei"))
    })

    it("ANDs comma-separated filters across features", () => {
        const v = tagRows(makeRule("V", ["a", "e", "o", "y"], {terminalOnly: true}),
            [["flat"], ["front", "flat"], ["back", "round"], ["front", "round"]])
        const letters = new Set(sample(harmonyConfig("V<front, !round>", {}, [v], [harmony, rounding])).flatMap(w => w.split("")))
        expect(letters).toEqual(new Set("e"))
    })

    it("applies on top of the chosen values", () => {
        const words = sample(harmonyConfig("V.V<!front>", {chooses: ["harmony"]}))
        expect(words.filter(mixes)).toEqual([])
        expect(new Set(words.map(w => w[1]))).toEqual(new Set("aou"))
    })

    it("selects in rewrite matches and exclusions", () => {
        const rewrite = harmonyConfig("V{3}", {chooses: ["harmony"], showRewrites: true, rewrites: [{id: "r", match: "V<back>", replace: "'X'"}]})
        expect(sample(rewrite).every(w => !/[ou]/.test(w))).toBe(true)
        const exclusion = harmonyConfig("V{2}", {chooses: ["harmony"], showExclusions: true, exclusions: [{id: "x", match: "V<front>"}]})
        expect(sample(exclusion).every(w => /^[aou]+$/.test(w))).toBe(true)
    })
})

describe("runtime dead ends", () => {
    // configToGrammar rejects these statically; a raw grammar shows the generator still names the problem.
    const raw = (word: string) => makeRawGrammar("W", [
        makeRawRule("W", makeRef("F", [{value: "back", negate: false}]), [], [], {chooses: ["harmony"]}),
        makeRawRule("F", makeWeightedChoice([{expr: makeAtom(word), weight: 1, tags: new Map([["harmony", new Set(["front"])]])}]), [], []),
    ], false, false, [{name: "harmony", values: [{name: "front", weight: 1}, {name: "back", weight: 1}]}])

    it("names the rule, the chosen value and the filter", () => {
        expect(() => generate(raw("e"), mulberry32(1))).toThrow(/No alternative of rule 'F' can be used when harmony is (front|back) through <back>/)
    })
})

describe("matching ignores scope", () => {
    it("lets a filter-free exclusion see every alternative", () => {
        const config = harmonyConfig("C.V", {chooses: ["harmony"], showExclusions: true, exclusions: [{id: "x", match: "'p'.V"}]})
        expect(sample(config).filter(w => w.startsWith("p"))).toEqual([])
    })
})
