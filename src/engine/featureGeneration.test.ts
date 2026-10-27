import {describe, expect, it} from "vitest"
import {generate} from "./generate.ts"
import {enumerate} from "./enumerate.ts"
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

    it("filters the rows of a rule referenced as an alternative, at any choice", () => {
        const rows = makeRule("S", ["V", "'y'"])
        expect(sample(harmonyConfig("[C.S]{3}", {chooses: ["harmony"]}, [rows, vowels, consonants])).filter(mixes)).toEqual([])
        expect(sample(harmonyConfig("[C.[V / 'y']]{3}", {chooses: ["harmony"]}, [vowels, consonants])).filter(mixes)).toEqual([])
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
        makeRawRule("F", makeWeightedChoice([{expr: makeAtom(word), weight: 1, tags: new Map([["harmony", new Set(["front"])]])}]), [], [], {classifies: ["harmony"]}),
    ], false, false, [{name: "harmony", values: [{name: "front", weight: 1}, {name: "back", weight: 1}]}])

    it("names the rule, the chosen value and the filter", () => {
        expect(() => generate(raw("e"), mulberry32(1))).toThrow(/No row of rule 'F' can be used when harmony (is (front|back) and )?must be back/)
    })
})

describe("matching without filters", () => {
    it("lets a filter-free exclusion see every alternative", () => {
        const config = harmonyConfig("C.V", {chooses: ["harmony"], showExclusions: true, exclusions: [{id: "x", match: "'p'.V"}]})
        expect(sample(config).filter(w => w.startsWith("p"))).toEqual([])
    })
})

describe("declared features", () => {
    // a carries height a, e carries b, i carries none of the values.
    const height = makeFeature("height", ["low", "high"])
    const vowel = tagRows(makeRule("Vowel", ["a", "e", "i"], {terminalOnly: true}), [["low"], ["high"]])
    const syllable = makeRule("Syllable", ["'t'.Vowel"])
    const words = (word: string, extra: Parameters<typeof makeRule>[2] = {}) =>
        enumerate(configToGrammar(makeConfig("Word", [makeRule("Word", [word], extra), syllable, vowel], {features: [height]}))!).words

    it("keeps only the rows carrying the value with <value>, untagged ones included", () => {
        expect(words("Vowel<low>")).toEqual(["a"])
    })

    it("removes only the rows carrying the value with <!value>", () => {
        expect(words("Vowel<!high>")).toEqual(["a", "i"])
    })

    it("keeps untagged rows under a choice", () => {
        expect(words("Vowel", {chooses: ["height"]})).toEqual(["a", "e", "i"])
        const g = configToGrammar(makeConfig("Word", [makeRule("Word", ["Vowel.Vowel"], {chooses: ["height"]}), vowel], {features: [height]}))!
        expect(enumerate(g).words).not.toContain("ae")
        expect(enumerate(g).words).toContain("ai")
    })

    it("reaches through rules that are not classified by the feature", () => {
        expect(words("Syllable<low>")).toEqual(["ta"])
        expect(words("Syllable<!low>")).toEqual(["te", "ti"])
    })

    it("lets a choice below a filter pick only among the values it allows, keeping the filter strict", () => {
        const g = configToGrammar(makeConfig("Word", [
            makeRule("Word", ["Inner<low>"]),
            makeRule("Inner", ["Vowel"], {chooses: ["height"]}),
            vowel,
        ], {features: [height]}))!
        expect(enumerate(g).words).toEqual(["a"])
        expect(new Set(Array.from({length: 50}, (_, i) => generate(g, mulberry32(i))))).toEqual(new Set(["a"]))
    })

    it("lets a nested choice pick again among every value", () => {
        const g = configToGrammar(makeConfig("Word", [
            makeRule("Word", ["Vowel.Inner"], {chooses: ["height"]}),
            makeRule("Inner", ["Vowel"], {chooses: ["height"]}),
            vowel,
        ], {features: [height]}))!
        expect(enumerate(g).words).toContain("ae")
    })

    // Words drawn by the previous release, so old seeds keep their words.
    it("gives grammars without features the same words for the same seed", () => {
        const plain = makeConfig("Word", [makeRule("Word", ["Syllable{2}"]), syllable, makeRule("Vowel", ["a", "e", "i"], {terminalOnly: true})])
        const g = configToGrammar(plain)!
        expect(Array.from({length: 5}, (_, i) => generate(g, mulberry32(i)))).toEqual(["tate", "tita", "tete", "tate", "tate"])
    })

    it("applies the same recursive filter in exclusions", () => {
        const g = configToGrammar(makeConfig("Word", [
            makeRule("Word", ["Syllable{2}"], {showExclusions: true, exclusions: [{id: "x", match: "Syllable<low>.Syllable<low>"}]}),
            syllable, vowel,
        ], {features: [height]}))!
        const all = enumerate(g).words
        expect(all).not.toContain("tata")
        expect(all).toContain("tate")
    })
})
