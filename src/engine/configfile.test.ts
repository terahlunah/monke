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
            rules: valid.rules.map(r => ({...r, collapsed: undefined})),
        }
        const parsed = parseConfigFile(JSON.stringify(old))
        expect(parsed.language).toBe("")
        expect(parsed.enableSerif).toBe(false)
        expect(parsed.enableWeights).toBe(false)
        expect(parsed.rules[0].collapsed).toBe(false)
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
        ["a non-boolean flag", JSON.stringify({...valid, enableSerif: "yes"})],
    ])("rejects %s", (_, text) => {
        expect(() => parseConfigFile(text)).toThrow(/Invalid config file/)
    })
})
