import {describe, expect, it} from "vitest"
import {configToGrammar, GrammarError} from "./buildGrammar.ts"
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

describe("implicit choices", () => {
    it("rejects a tagged item reached where nothing chooses its feature, on that item", () => {
        const e = errorOf(harmonyConfig("[C.V]{2}", {}))
        expect(e.message).toMatch(/carries harmony values, but no enclosing rule chooses harmony/)
        expect([e.ruleId, e.itemId]).toEqual(["V", "V1"])
    })

    it("rejects rule values reached where nothing chooses their feature, on the rule's values", () => {
        const front = makeRule("F", ["e"], {terminalOnly: true, values: ["front"]})
        const e = errorOf(harmonyConfig("C.F", {}, [front, consonants]))
        expect([e.ruleId, e.itemId]).toEqual(["F", RULE_VALUES_ITEM])
    })

    it("accepts the same item when an enclosing rule chooses, however deep", () => {
        const syllable = makeRule("S", ["C.V"])
        expect(() => configToGrammar(harmonyConfig("S{2}", {chooses: ["harmony"]}, [syllable, vowels, consonants]))).not.toThrow()
    })

    it("accepts a filter instead of a choice for the filtered rule's alternatives", () => {
        expect(() => configToGrammar(harmonyConfig("C.V<!back>", {}))).not.toThrow()
        expect(() => configToGrammar(harmonyConfig("C.V<front>", {}))).not.toThrow()
    })

    it("still requires a choice below the filtered level", () => {
        const syllable = makeRule("S", ["C.V"])
        const e = errorOf(harmonyConfig("S<!back>", {}, [syllable, vowels, consonants]))
        expect(e.itemId).toBe("V1")
    })

    it("ignores items that are never reached", () => {
        expect(() => configToGrammar(harmonyConfig("C{2}", {}))).not.toThrow()
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
