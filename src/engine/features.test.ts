import {describe, expect, it} from "vitest"
import {configToGrammar, GrammarError, unnamedFeatureWarnings} from "./buildGrammar.ts"
import {enumerate} from "./enumerate.ts"
import {generate} from "./generate.ts"
import {countCombinations} from "./analysis.ts"
import {seededRng} from "./seed.ts"
import {featureWarnings, RULE_CHOOSES_ITEM, RULE_CLASSIFIES_ITEM} from "./features.ts"
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

describe("rule declarations", () => {
    it("rejects a row value of a feature the rule is not classified by, on the row", () => {
        const e = errorOf(harmonyConfig("C.V", {chooses: ["harmony"]}, [{...vowels, classifies: []}, consonants]))
        expect(e.message).toMatch(/Rule 'V' is not classified by harmony, so its rows cannot carry harmony values/)
        expect([e.ruleId, e.itemId]).toEqual(["V", "V1"])
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

    it("warns once on the rule's features control, naming the rule, its user and the feature", () => {
        const g = configToGrammar(harmonyConfig("[C.V]{2}", {}))!
        expect(featureWarnings(g)).toEqual([
            {message: "Feature 'harmony' is neither chosen nor filtered when rule 'V' is used in 'Word'; all its rows are kept", ownerId: "V", itemId: RULE_CLASSIFIES_ITEM},
        ])
    })

    it("is quiet when an enclosing rule chooses, however deep", () => {
        const syllable = makeRule("S", ["C.V"])
        expect(featureWarnings(configToGrammar(harmonyConfig("S{2}", {chooses: ["harmony"]}, [syllable, vowels, consonants]))!)).toEqual([])
    })

    it("is quiet when a filter selects on the feature instead", () => {
        expect(featureWarnings(configToGrammar(harmonyConfig("C.V<!back>", {}))!)).toEqual([])
        expect(featureWarnings(configToGrammar(harmonyConfig("C.V<front>", {}))!)).toEqual([])
    })

    it("is quiet below a filter, which reaches every rule under the reference", () => {
        const syllable = makeRule("S", ["C.V"])
        expect(featureWarnings(configToGrammar(harmonyConfig("S<!back>", {}, [syllable, vowels, consonants]))!)).toEqual([])
    })

    it("warns where the same rule is also reached without a filter", () => {
        const syllable = makeRule("S", ["C.V"])
        const warnings = featureWarnings(configToGrammar(harmonyConfig("S<!back>.S", {}, [syllable, vowels, consonants]))!)
        expect(warnings.map(w => [w.ownerId, w.itemId])).toEqual([["V", RULE_CLASSIFIES_ITEM]])
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

    it("rejects filters that leave no row, on the pattern holding the filter", () => {
        const front = tagRows(makeRule("F", ["e", "i"], {terminalOnly: true}), [["front"], ["front"]])
        const e = errorOf(harmonyConfig("F<back>", {}, [front]))
        expect(e.message).toMatch(/No row of rule 'F' can be used when harmony must be back/)
        expect([e.ruleId, e.itemId]).toEqual(["Word", "Word0"])
    })

    it("rejects a filter that contradicts a choice above it", () => {
        const syllable = makeRule("S", ["C.V<back>"])
        const e = errorOf(harmonyConfig("S", {chooses: ["harmony"]}, [syllable, vowels, consonants]))
        expect(e.message).toMatch(/No row of rule 'V' can be used when harmony is front and must be back/)
        expect([e.ruleId, e.itemId]).toEqual(["S", "S0"])
    })

    it("rejects a filter no rule below the reference is classified by", () => {
        const e = errorOf(harmonyConfig("C<front>.V", {chooses: ["harmony"]}))
        expect(e.message).toMatch(/filter front on 'C' has no effect: no rule it reaches is classified by harmony/)
        expect([e.ruleId, e.itemId]).toEqual(["Word", "Word0"])
    })

    it("rejects a choice the filters above leave no value for", () => {
        const inner = makeRule("S", ["C.V"], {chooses: ["harmony"]})
        const e = errorOf(harmonyConfig("S<!front, !back>", {}, [inner, vowels, consonants]))
        expect(e.message).toMatch(/Rule 'S' chooses harmony, but the filters above it leave no value/)
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
        expect(e.message).toMatch(/No row of rule 'F' can be used when harmony is back/)
        expect([e.ruleId, e.itemId]).toEqual(["Word", RULE_CHOOSES_ITEM])
    })

    it("rejects a rule referenced as an alternative whose rows all disagree with some chosen value", () => {
        const front = tagRows(makeRule("F", ["e"], {terminalOnly: true}), [["front"]])
        const back = tagRows(makeRule("B", ["o"], {terminalOnly: true}), [["back"]])
        const e = errorOf(harmonyConfig("C.[F / B]", {chooses: ["harmony"]}, [front, back, consonants]))
        expect(e.message).toMatch(/No row of rule '[FB]' can be used when harmony is/)
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
            {message: "Rule 'Word' chooses harmony, but no rule it produces is classified by harmony", ownerId: "Word", itemId: RULE_CHOOSES_ITEM},
        ])
    })

    it("warns about a rule classified by a feature none of its rows carries", () => {
        const g = configToGrammar(harmonyConfig("C.V", {chooses: ["harmony"]}, [vowels, {...consonants, classifies: ["harmony"]}]))!
        expect(featureWarnings(g)).toEqual([
            {message: "Rule 'C' is classified by harmony, but none of its rows carries a harmony value", ownerId: "C", itemId: RULE_CLASSIFIES_ITEM},
        ])
    })

    it("is quiet for a well-formed grammar", () => {
        expect(featureWarnings(configToGrammar(harmonyConfig())!)).toEqual([])
    })
})
