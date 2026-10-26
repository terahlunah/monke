import {describe, expect, it} from "vitest"
import {ConfigAction, configReducer} from "./configReducer.ts"
import {makeConfig, makeRule} from "./test-helpers.ts"
import {defaultConfig, emptyConfig} from "./defaults.ts"

const base = () => makeConfig("A", [makeRule("A", ["'a'", "'b'"]), makeRule("B", ["'c'"])])
const apply = (...actions: ConfigAction[]) => actions.reduce(configReducer, base())

describe("whole-config actions", () => {
    it("load replaces everything", () => {
        expect(configReducer(base(), {type: "load", config: {...emptyConfig, seed: "s"}})).toEqual({...emptyConfig, seed: "s"})
    })

    it("load gives a config without a seed a random one", () => {
        const c = configReducer(base(), {type: "load", config: {...emptyConfig, seed: ""}})
        expect(c.seed).toMatch(/^[a-z2-9]{6}$/)
    })

    it("clear empties the grammar, keeps the display flags and picks a new seed", () => {
        const c = configReducer({...base(), enableWeights: true, enableSerif: true, seed: "s"}, {type: "clear"})
        expect(c).toEqual({language: "", root: null, rules: [], enableWeights: true, enableSerif: true, repeatRewrites: false, seed: c.seed})
        expect(c.seed).toMatch(/^[a-z2-9]{6}$/)
    })

    it("loadExample turns repeated rewrites off, since the example relies on single passes", () => {
        const c = configReducer({...base(), repeatRewrites: true}, {type: "loadExample", weighted: false})
        expect(c.repeatRewrites).toBe(false)
    })

    it("loadExample installs the toki pona grammar and sets weights accordingly", () => {
        const plain = configReducer(base(), {type: "loadExample", weighted: false})
        expect(plain).toMatchObject({language: "toki pona", root: defaultConfig.root, enableWeights: false})
        expect(plain.rules).toBe(defaultConfig.rules)
        expect(configReducer(base(), {type: "loadExample", weighted: true}).enableWeights).toBe(true)
    })

    it("sets language, root and flags independently", () => {
        const c = apply(
            {type: "setLanguage", language: "x"},
            {type: "setRoot", root: "B"},
            {type: "setEnableWeights", enabled: true},
            {type: "setEnableSerif", enabled: true},
            {type: "setRepeatRewrites", enabled: true},
            {type: "setSeed", seed: "abc"},
        )
        expect(c).toMatchObject({language: "x", root: "B", enableWeights: true, enableSerif: true, repeatRewrites: true, seed: "abc"})
    })
})

describe("rule actions", () => {
    it("adds empty rules, optionally terminal", () => {
        const c = apply({type: "addRule", terminalOnly: false}, {type: "addRule", terminalOnly: true})
        expect(c.rules.slice(2)).toMatchObject([{name: "", terminalOnly: false}, {name: "", terminalOnly: true}])
        expect(c.rules[2].id).not.toBe(c.rules[3].id)
    })

    it("removing the root rule clears the root", () => {
        expect(apply({type: "removeRule", ruleId: "B"})).toMatchObject({root: "A", rules: [{name: "A"}]})
        expect(apply({type: "removeRule", ruleId: "A"})).toMatchObject({root: null, rules: [{name: "B"}]})
    })

    it("duplicates right after the source with fresh ids everywhere", () => {
        const c = apply({type: "duplicateRule", ruleId: "A"})
        const [src, copy] = c.rules
        expect(c.rules.map(r => r.name)).toEqual(["A", "A clone", "B"])
        expect(copy.patterns.map(p => p.pattern)).toEqual(["'a'", "'b'"])
        const ids = [...src.patterns, ...copy.patterns, src, copy].map(x => x.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("moves, renames, collapses and toggles sections by rule id", () => {
        const c = apply(
            {type: "moveRule", from: 0, to: 1},
            {type: "renameRule", ruleId: "A", name: "Z"},
            {type: "toggleCollapse", ruleId: "B"},
            {type: "setShowRewrites", ruleId: "B", show: true},
            {type: "setShowExclusions", ruleId: "B", show: true},
        )
        expect(c.rules.map(r => r.name)).toEqual(["B", "Z"])
        expect(c.rules[0]).toMatchObject({collapsed: true, showRewrites: true, showExclusions: true})
        expect(c.rules[1]).toMatchObject({collapsed: false, showRewrites: false})
    })

    it("ignores unknown rule ids", () => {
        expect(apply({type: "removeRule", ruleId: "nope"}, {type: "toggleCollapse", ruleId: "nope"})).toEqual(base())
    })
})

describe("pattern actions", () => {
    it("adds, edits, moves and removes patterns", () => {
        let c = apply({type: "addPattern", ruleId: "A"})
        expect(c.rules[0].patterns).toHaveLength(3)
        expect(c.rules[0].patterns[2]).toMatchObject({pattern: "", weight: 1})

        c = configReducer(c, {type: "editPattern", ruleId: "A", id: "A0", patch: {pattern: "'z'", weight: 4}})
        expect(c.rules[0].patterns[0]).toMatchObject({id: "A0", pattern: "'z'", weight: 4})

        c = configReducer(c, {type: "movePattern", ruleId: "A", from: 0, to: 1})
        expect(c.rules[0].patterns.slice(0, 2).map(p => p.id)).toEqual(["A1", "A0"])

        c = configReducer(c, {type: "removePattern", ruleId: "A", id: "A1"})
        expect(c.rules[0].patterns.map(p => p.id)).toEqual(["A0", c.rules[0].patterns[1].id])
        expect(c.rules[1].patterns).toHaveLength(1)
    })

    it("adds several patterns at once, in order, with their own ids and weight 1", () => {
        const c = apply({type: "addPatterns", ruleId: "A", patterns: ["p", "t", "k"]})

        expect(c.rules[0].patterns.map(p => p.pattern)).toEqual(["'a'", "'b'", "p", "t", "k"])
        expect(c.rules[0].patterns.slice(2).map(p => p.weight)).toEqual([1, 1, 1])
        expect(new Set(c.rules[0].patterns.map(p => p.id)).size).toBe(5)
        expect(c.rules[1].patterns).toHaveLength(1)
    })
})

describe("rewrite and exclusion actions", () => {
    it("adds, edits, moves and removes rewrites", () => {
        let c = apply({type: "addRewrite", ruleId: "A"}, {type: "addRewrite", ruleId: "A"})
        const [first, second] = c.rules[0].rewrites
        c = configReducer(c, {type: "editRewrite", ruleId: "A", id: first.id, patch: {match: "'a'", replace: "'b'"}})
        expect(c.rules[0].rewrites[0]).toMatchObject({match: "'a'", replace: "'b'"})
        c = configReducer(c, {type: "moveRewrite", ruleId: "A", from: 1, to: 0})
        expect(c.rules[0].rewrites.map(r => r.id)).toEqual([second.id, first.id])
        c = configReducer(c, {type: "removeRewrite", ruleId: "A", id: second.id})
        expect(c.rules[0].rewrites.map(r => r.id)).toEqual([first.id])
    })

    it("adds, edits, moves and removes exclusions", () => {
        let c = apply({type: "addExclusion", ruleId: "A"}, {type: "addExclusion", ruleId: "A"})
        const [first, second] = c.rules[0].exclusions
        c = configReducer(c, {type: "editExclusion", ruleId: "A", id: second.id, patch: {match: "'x'"}})
        expect(c.rules[0].exclusions[1].match).toBe("'x'")
        c = configReducer(c, {type: "moveExclusion", ruleId: "A", from: 0, to: 1})
        expect(c.rules[0].exclusions.map(e => e.id)).toEqual([second.id, first.id])
        c = configReducer(c, {type: "removeExclusion", ruleId: "A", id: first.id})
        expect(c.rules[0].exclusions.map(e => e.id)).toEqual([second.id])
    })
})
