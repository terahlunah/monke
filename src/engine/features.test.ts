import {describe, expect, it} from "vitest"
import {configToGrammar, GrammarError, unnamedFeatureWarnings} from "./buildGrammar.ts"
import {enumerate} from "./enumerate.ts"
import {generate} from "./generate.ts"
import {countCombinations} from "./analysis.ts"
import {seededRng} from "./seed.ts"
import {featureWarnings, RULE_CHOOSES_ITEM, RULE_VALUES_ITEM} from "./features.ts"
import {Config, Feature} from "./config.ts"
import {consonants, harmony, harmonyConfig, makeConfig, makeFeature, makeRule, rounding, tagRows, vowels} from "./test-helpers.ts"

const errorOf = (config: Config): GrammarError => {
    try {
        configToGrammar(config)
    } catch (e) {
        return e as GrammarError
    }
    throw new Error("expected a grammar error")
}

describe("feature declarations", () => {
    it("builds tags, chooses and the value index", () => {
        const g = configToGrammar(harmonyConfig())!
        expect(g.valueFeature.get("front")).toBe("harmony")
        expect(g.ruleMap.get("Word")!.chooses).toEqual(["harmony"])
        const rows = g.ruleMap.get("V")!.expr
        expect(rows.tag === "Choice" && rows.items.map(r => r.tags?.get("harmony") && [...r.tags.get("harmony")!]))
            .toEqual([undefined, ["front"], ["front"], ["back"], ["back"]])
    })

    it.each([
        ["an invalid feature name", [makeFeature("1x", ["a"])], "1x", undefined, /Invalid feature name/],
        ["a duplicate feature name", [makeFeature("h", ["a"]), {...makeFeature("h", ["b"]), id: "h2"}], "h2", undefined, /Duplicate feature name/],
        ["an invalid value name", [makeFeature("h", ["a b"])], "h", "a b", /Invalid value name/],
        ["a value name used by two features", [makeFeature("h", ["a"]), makeFeature("r", [["a", 1]])], "r", "a", /unique across features/],
    ])("rejects %s on the feature input", (_, features, ownerId, itemId, message) => {
        const e = errorOf(makeConfig("W", [makeRule("W", ["'x'"])], {features: features as Feature[]}))
        expect(e.message).toMatch(message)
        expect([e.ruleId, e.itemId]).toEqual([ownerId, itemId])
    })

    it("rejects choosing a feature without values", () => {
        const e = errorOf(harmonyConfig("'x'", {chooses: ["h"]}, [], [makeFeature("h", [])]))
        expect(e.message).toMatch(/has no values/)
        expect([e.ruleId, e.itemId]).toEqual(["Word", RULE_CHOOSES_ITEM])
    })
})

describe("unnamed declarations", () => {
    const pending = (features: Feature[]) => makeConfig("W", [makeRule("W", ["V"], {chooses: ["h"]}), vowels], {features})
    const unnamedValue: Feature = {id: "h", name: "h", values: [{id: "front", name: "front", weight: 1}, {id: "back", name: "", weight: 1}]}

    it("ignores an unnamed feature, with its choices, and warns on it", () => {
        const config = pending([{id: "h", name: "", values: [{id: "front", name: "front", weight: 1}]}])
        const g = configToGrammar(config)!
        expect(g.features).toEqual([])
        expect(g.ruleMap.get("W")!.chooses).toEqual([])
        expect(enumerate(g).words.sort()).toEqual(["a", "e", "i", "o", "u"])
        expect(unnamedFeatureWarnings(config.features)).toEqual([{message: "Feature 1 has no name yet; it is ignored", ownerId: "h"}])
    })

    it("ignores an unnamed value and warns on it", () => {
        const config = pending([unnamedValue])
        const g = configToGrammar(config)!
        expect(g.features[0].values.map(v => v.name)).toEqual(["front"])
        // Rows carrying the unnamed value count as untagged, so they stay in play whatever is chosen.
        expect(enumerate(g).words.sort()).toEqual(["a", "e", "i", "o", "u"])
        expect(unnamedFeatureWarnings(config.features)).toEqual([
            {message: "Value 2 of feature 'h' has no name yet; it is ignored", ownerId: "h", itemId: "back"},
        ])
    })

    it("ignores a feature whose values are all unnamed", () => {
        const g = configToGrammar(pending([{id: "h", name: "h", values: [{id: "nv", name: "", weight: 1}]}]))!
        expect(g.features).toEqual([])
        expect(enumerate(g).words).toHaveLength(5)
    })
})

describe("unchosen features", () => {
    it("keeps every row of a tagged rule reached where nothing chooses its feature", () => {
        const g = configToGrammar(harmonyConfig("C.V", {}))!
        expect(enumerate(g).words).toHaveLength(15)
        expect(countCombinations(g)).toBe(15)
        const drawn = new Set(Array.from({length: 300}, (_, i) => generate(g, seededRng(String(i)))))
        expect(drawn.size).toBe(15)
    })

    it("warns once on the tagged item, naming the rule, its user and the feature", () => {
        const g = configToGrammar(harmonyConfig("[C.V]{2}", {}))!
        expect(featureWarnings(g)).toEqual([
            {message: "Feature 'harmony' is not chosen when rule 'V' is used in 'Word'; its values are all kept", ownerId: "V", itemId: "V1"},
            {message: "Feature 'harmony' is not chosen when rule 'V' is used in 'Word'; its values are all kept", ownerId: "V", itemId: "V2"},
            {message: "Feature 'harmony' is not chosen when rule 'V' is used in 'Word'; its values are all kept", ownerId: "V", itemId: "V3"},
            {message: "Feature 'harmony' is not chosen when rule 'V' is used in 'Word'; its values are all kept", ownerId: "V", itemId: "V4"},
        ])
    })

    it("warns on a rule's own values, keeping it in play", () => {
        const front = makeRule("F", ["e"], {terminalOnly: true, values: ["front"]})
        const g = configToGrammar(harmonyConfig("C.F", {}, [front, consonants]))!
        expect(featureWarnings(g)).toContainEqual(
            {message: "Feature 'harmony' is not chosen when rule 'F' is used in 'Word'; its values are all kept", ownerId: "F", itemId: RULE_VALUES_ITEM})
        expect(enumerate(g).words).toHaveLength(3)
    })

    it("is quiet when an enclosing rule chooses, however deep", () => {
        const syllable = makeRule("S", ["C.V"])
        expect(featureWarnings(configToGrammar(harmonyConfig("S{2}", {chooses: ["harmony"]}, [syllable, vowels, consonants]))!)).toEqual([])
    })

    it("is quiet when a filter selects on the feature instead", () => {
        expect(featureWarnings(configToGrammar(harmonyConfig("C.V<!back>", {}))!)).toEqual([])
        expect(featureWarnings(configToGrammar(harmonyConfig("C.V<front>", {}))!)).toEqual([])
    })

    it("warns below the filtered level", () => {
        const syllable = makeRule("S", ["C.V"])
        const warnings = featureWarnings(configToGrammar(harmonyConfig("S<!back>", {}, [syllable, vowels, consonants]))!)
        expect(warnings.map(w => w.itemId)).toContain("V1")
        expect(warnings[0].message).toMatch(/rule 'V' is used in 'S'/)
    })

    it("ignores items that are never reached", () => {
        expect(featureWarnings(configToGrammar(harmonyConfig("C{2}", {}))!)).toEqual([])
    })
})

describe("filters", () => {
    it("rejects an unknown value on the pattern", () => {
        const e = errorOf(harmonyConfig("C.V<frnt>", {}))
        expect(e.message).toMatch(/Unknown feature value 'frnt'/)
        expect([e.ruleId, e.itemId]).toEqual(["Word", "Word0"])
    })

    it("rejects unknown values in rewrite and exclusion matches too", () => {
        const e = errorOf(harmonyConfig("C.V", {chooses: ["harmony"], showExclusions: true, exclusions: [{id: "x", match: "V<nope>"}]}))
        expect([e.ruleId, e.itemId]).toEqual(["Word", "x"])
    })

    it("rejects filters that leave no alternative", () => {
        const front = tagRows(makeRule("F", ["e", "i"], {terminalOnly: true}), [["front"], ["front"]])
        const e = errorOf(harmonyConfig("F<back>", {chooses: ["harmony"]}, [front]))
        expect(e.message).toMatch(/No alternative of rule 'F' can be used through <back>/)
    })

    it("rejects a filter that the chosen value empties, naming the value", () => {
        const front = tagRows(makeRule("F", ["e", "o"], {terminalOnly: true}), [["front"], ["back"]])
        const e = errorOf(harmonyConfig("F<front>", {chooses: ["harmony"]}, [front]))
        expect(e.message).toMatch(/when harmony is back through <front>/)
        expect([e.ruleId, e.itemId]).toEqual(["Word", "Word0"])
    })

    it("accepts a negative filter that keeps neutral items", () => {
        const front = tagRows(makeRule("F", ["a", "e"], {terminalOnly: true}), [[], ["front"]])
        expect(() => configToGrammar(harmonyConfig("F<!front>", {chooses: ["harmony"]}, [front]))).not.toThrow()
    })
})

describe("dead ends", () => {
    it("rejects a rule whose alternatives all disagree with some chosen value", () => {
        const front = tagRows(makeRule("F", ["e", "i"], {terminalOnly: true}), [["front"], ["front"]])
        const e = errorOf(harmonyConfig("F", {chooses: ["harmony"]}, [front]))
        expect(e.message).toMatch(/No alternative of rule 'F' can be used when harmony is back/)
        expect(e.ruleId).toBe("F")
    })

    it("rejects a rule referenced in a sequence whose own values exclude it", () => {
        const front = makeRule("F", ["e"], {terminalOnly: true, values: ["front"]})
        const e = errorOf(harmonyConfig("C.F", {chooses: ["harmony"]}, [front, consonants]))
        expect(e.message).toMatch(/Rule 'F' cannot be used when harmony is back/)
    })

    it("accepts tagged rules as alternatives, since out-of-scope ones are removed", () => {
        const front = makeRule("F", ["e"], {terminalOnly: true, values: ["front"]})
        const back = makeRule("B", ["o"], {terminalOnly: true, values: ["back"]})
        expect(() => configToGrammar(harmonyConfig("C.[F / B]", {chooses: ["harmony"]}, [front, back, consonants]))).not.toThrow()
    })
})

describe("featureWarnings", () => {
    it("warns about a declared feature nothing uses", () => {
        const g = configToGrammar(harmonyConfig("[C.V]{2}", {chooses: ["harmony"]}, [vowels, consonants], [harmony, rounding]))!
        expect(featureWarnings(g, new Map([["rounding", "rid"]]))).toEqual([
            {message: "Feature 'rounding' is not used by any rule", ownerId: "rid"},
        ])
    })

    it("warns about a choice nothing below the rule reacts to", () => {
        const g = configToGrammar(harmonyConfig("C{2}", {chooses: ["harmony"]}))!
        expect(featureWarnings(g)).toEqual([
            {message: "Rule 'Word' chooses harmony, but nothing it produces carries harmony values", ownerId: "Word", itemId: RULE_CHOOSES_ITEM},
        ])
    })

    it("is quiet for a well-formed grammar", () => {
        expect(featureWarnings(configToGrammar(harmonyConfig())!)).toEqual([])
    })
})
