import {describe, expect, it} from "vitest"
import {parseConfigFile} from "./configfile.ts"
import {makeConfig, makeRule} from "./test-helpers.ts"

const valid = makeConfig("R", [makeRule("R", ["'a'", "'b'"], {
    showRewrites: true,
    rewrites: [{id: "w", match: "'a'", replace: "'b'"}],
    showExclusions: true,
    exclusions: [{id: "e", match: "'b'"}],
})])

describe("parseConfigFile", () => {
    it("round-trips an exported config", () => {
        expect(parseConfigFile(JSON.stringify(valid, null, 4))).toEqual(valid)
    })

    it("accepts a null root", () => {
        expect(parseConfigFile(JSON.stringify({...valid, root: null})).root).toBeNull()
    })

    it("defaults fields missing from older exports", () => {
        const old = {
            ...valid,
            language: undefined,
            enableSerif: undefined,
            enableWeights: undefined,
            repeatRewrites: undefined,
            seed: undefined,
            features: undefined,
            rules: valid.rules.map(r => ({...r, collapsed: undefined})),
        }
        const parsed = parseConfigFile(JSON.stringify(old))
        expect(parsed.repeatRewrites).toBe(false)
        expect(parsed.seed).toBe("")
        expect(parsed.language).toBe("")
        expect(parsed.enableSerif).toBe(false)
        expect(parsed.enableWeights).toBe(false)
        expect(parsed.rules[0].collapsed).toBe(false)
        expect(parsed.features).toEqual([])
    })

    it("round-trips features, rule declarations, item values and chooses", () => {
        const featured = makeConfig("R", [makeRule("R", ["'a'"], {chooses: ["h"], classifies: ["h"]})], {
            features: [{id: "h", name: "harmony", values: [{id: "f", name: "front", weight: 2}]}],
        })
        featured.rules[0].patterns[0].values = ["f"]
        expect(parseConfigFile(JSON.stringify(featured))).toEqual(featured)
    })

    it("reads a rule without declarations as classified by the features its rows carry", () => {
        const features = [
            {id: "h", name: "harmony", values: [{id: "f", name: "front", weight: 1}]},
            {id: "r", name: "rounding", values: [{id: "o", name: "round", weight: 1}]},
        ]
        const old = makeConfig("R", [makeRule("R", ["'a'", "'b'"], {classifies: []}), makeRule("S", ["'c'"], {classifies: []})], {features})
        old.rules[0].patterns[1].values = ["f"]
        const json = JSON.parse(JSON.stringify(old))
        for (const r of json.rules) delete r.classifies
        const parsed = parseConfigFile(JSON.stringify(json))
        expect(parsed.rules.map(r => r.classifies)).toEqual([["h"], undefined])
    })

    it("rejects declarations that are not a list of ids", () => {
        const bad = JSON.parse(JSON.stringify(valid))
        bad.rules[0].classifies = "harmony"
        expect(() => parseConfigFile(JSON.stringify(bad))).toThrow(/rules\[0\]\.classifies must be a list of text/)
    })

    it("ignores values on a rule, which only rows carry", () => {
        const config = makeConfig("R", [makeRule("R", ["'a'"])])
        const json = JSON.parse(JSON.stringify(config))
        json.rules[0].values = ["f"]
        expect(parseConfigFile(JSON.stringify(json))).toEqual(config)
    })

    it("reads a pattern's repeat factor and rejects one that is not a number", () => {
        const rule = makeRule("R", ["'a'", "'b'"])
        const repeating = makeConfig("R", [{...rule, patterns: [{...rule.patterns[0], repeat: 0.5}, rule.patterns[1]]}])
        expect(parseConfigFile(JSON.stringify(repeating))).toEqual(repeating)
        const bad = {...repeating, rules: [{...rule, patterns: [{...rule.patterns[0], repeat: "x"}]}]}
        expect(() => parseConfigFile(JSON.stringify(bad))).toThrow("rules[0].patterns[0].repeat must be a number")
    })

    it("drops unknown keys", () => {
        const parsed = parseConfigFile(JSON.stringify({...valid, extra: 1}))
        expect(parsed).not.toHaveProperty("extra")
    })

    it.each([
        ["malformed JSON", "{nope"],
        ["a non-object", "[1]"],
        ["a null document", "null"],
        ["a missing field", JSON.stringify({...valid, rules: [{...valid.rules[0], name: undefined}]})],
        ["a wrong-typed root", JSON.stringify({...valid, root: 3})],
        ["rules that are not a list", JSON.stringify({...valid, rules: {}})],
        ["a rule that is not an object", JSON.stringify({...valid, rules: [1]})],
        ["a non-numeric weight", JSON.stringify({
            ...valid,
            rules: [{...valid.rules[0], patterns: [{id: "p", pattern: "a", weight: "1"}]}],
        })],
        ["chooses that are not a list of ids", JSON.stringify({...valid, rules: [{...valid.rules[0], chooses: [1]}]})],
        ["a feature value without a weight", JSON.stringify({...valid, features: [{id: "h", name: "h", values: [{id: "v", name: "v"}]}]})],
        ["a non-boolean flag", JSON.stringify({...valid, enableSerif: "yes"})],
    ])("rejects %s", (_, text) => {
        expect(() => parseConfigFile(text)).toThrow(/Invalid config file/)
    })
})
