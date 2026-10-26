import {describe, expect, it} from "vitest"
import {enumerate} from "./enumerate.ts"
import {generate} from "./generate.ts"
import {makeGrammar, makeRule, mulberry32} from "./test-helpers.ts"
import {tokiPonaRoot, tokiPonaRules} from "./defaults.ts"

const words = (g: Parameters<typeof enumerate>[0]) => enumerate(g).words

// The enumeration must be exactly the set of words generation can reach.
const expectMatchesGenerator = (g: Parameters<typeof enumerate>[0], samples = 5000) => {
    const rng = mulberry32(7)
    const seen = new Set(Array.from({length: samples}, () => generate(g, rng)))
    expect([...seen].sort()).toEqual([...words(g)].sort())
}

describe("enumerate", () => {
    it("lists every combination of a small grammar, sorted", () => {
        const g = makeGrammar("W", [makeRule("W", ["C.V"]), makeRule("C", ["p", "t"], {terminalOnly: true}), makeRule("V", ["a", "i"], {terminalOnly: true})])
        expect(enumerate(g)).toEqual({words: ["pa", "pi", "ta", "ti"], truncated: false})
    })

    it("dedupes identical outputs of different branches", () => {
        expect(words(makeGrammar("W", [makeRule("W", ["'a'.('b') / 'ab' / 'a'"])]))).toEqual(["a", "ab"])
    })

    it("expands optionals and quantifiers", () => {
        expect(words(makeGrammar("W", [makeRule("W", ["'k'.'a'{0:2}"])]))).toEqual(["k", "ka", "kaa"])
    })

    it("drops excluded words", () => {
        const g = makeGrammar("W", [makeRule("W", ["['p' / 't'].['a' / 'i']"], {showExclusions: true, exclusions: [{id: "x", match: "'ti'"}]})])
        expect(words(g)).toEqual(["pa", "pi", "ta"])
    })

    it("applies rewrites, branching on replacement choices and back-references", () => {
        const g = makeGrammar("W", [makeRule("W", ["'nn' / 'an'"], {
            showRewrites: true,
            rewrites: [{id: "r", match: "'n'.'n'", replace: "#0#.['' / 'm']"}],
        })])
        expect(words(g)).toEqual(["an", "n", "nm"])
    })

    it("repeats rewrites when enabled", () => {
        const rules = [makeRule("W", ["'aaa'"], {showRewrites: true, rewrites: [{id: "r", match: "'aa'", replace: "'a'"}]})]
        expect(words(makeGrammar("W", rules))).toEqual(["aa"])
        expect(words(makeGrammar("W", rules, {repeatRewrites: true}))).toEqual(["a"])
    })

    it("skips zero-weight alternatives only when weights are on", () => {
        const rules = [makeRule("W", ["'a'*0 / 'b'"])]
        expect(words(makeGrammar("W", rules, {enableWeights: true}))).toEqual(["b"])
        expect(words(makeGrammar("W", rules))).toEqual(["a", "b"])
    })

    it("matches the generator on the Toki Pona example", () => {
        expectMatchesGenerator(makeGrammar("W", [
            makeRule("W", ["C.V.('n')"], {showExclusions: true, exclusions: [{id: "x", match: "'ji'"}], showRewrites: true, rewrites: [{id: "r", match: "'tin'", replace: "'ten' / 'tun'"}]}),
            makeRule("C", ["t", "j", "k"], {terminalOnly: true}),
            makeRule("V", ["a", "i"], {terminalOnly: true}),
        ]))
        const g = makeGrammar(tokiPonaRoot, tokiPonaRules)
        const all = enumerate(g)
        expect(all.truncated).toBe(true)
        expect(all.words).toHaveLength(10_000)
        for (const w of all.words) expect(w).not.toMatch(/wu|wo|ji|ti|nn|nm/)
    })

    it("truncates at the limit and reports it", () => {
        const g = makeGrammar("W", [makeRule("W", ["C{3}"]), makeRule("C", ["a", "b", "c", "d", "e"], {terminalOnly: true})])
        expect(enumerate(g).words).toHaveLength(125)
        const capped = enumerate(g, {limit: 50})
        expect(capped.truncated).toBe(true)
        expect(capped.words).toHaveLength(50)
    })

    it("stops when the work budget runs out", () => {
        const g = makeGrammar("W", [makeRule("W", ["C{6}"]), makeRule("C", ["a", "b", "c", "d", "e"], {terminalOnly: true})])
        const result = enumerate(g, {budget: 1000})
        expect(result.truncated).toBe(true)
        expect(result.words.length).toBeLessThanOrEqual(1000)
    })

    it("refuses grammars with a cycle", () => {
        const g = makeGrammar("A", [makeRule("A", ["'a'.B / 'a'"]), makeRule("B", ["A"])])
        expect(() => enumerate(g)).toThrow(/cycle: A > B > A/)
    })

    it("fails like generation when exclusions reject everything", () => {
        const g = makeGrammar("W", [makeRule("W", ["'a'"], {showExclusions: true, exclusions: [{id: "x", match: "'a'"}]})])
        expect(() => enumerate(g)).toThrow(/too restrictive/)
    })
})
