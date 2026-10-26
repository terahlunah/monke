import {describe, expect, it} from "vitest"
import {configToGrammar, GrammarError} from "./buildGrammar.ts"
import {makeAtom, makeChoice, makeWeighted, makeWeightedChoice} from "./grammar.ts"
import {makeConfig, makeRule} from "./test-helpers.ts"

const choice = makeChoice

describe("configToGrammar", () => {
    it("returns null without a root", () => {
        expect(configToGrammar(makeConfig("X", [], {root: null}))).toBeNull()
    })

    it("treats terminal-only patterns as literal atoms", () => {
        const g = configToGrammar(makeConfig("T", [
            makeRule("T", ["a.b", "(x)"], {terminalOnly: true}),
        ]))!
        expect(g.rules[0].expr).toEqual(choice([makeAtom("a.b"), makeAtom("(x)")]))
    })

    it("carries pattern weights and the weights flag", () => {
        const rule = makeRule("R", ["'a'"])
        rule.patterns[0].weight = 4
        const g = configToGrammar(makeConfig("R", [rule], {enableWeights: true}))!
        expect(g.useWeights).toBe(true)
        expect(g.rules[0].expr).toEqual(makeWeightedChoice([makeWeighted(makeAtom("a"), 4)]))
    })

    it("ignores exclusions and rewrites that are hidden", () => {
        const g = configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {
                exclusions: [{id: "e", match: "'a'"}],
                rewrites: [{id: "w", match: "'a'", replace: "'b'"}],
            }),
        ]))!
        expect(g.rules[0].exclusions).toEqual([])
        expect(g.rules[0].rewrites).toEqual([])
    })

    it("parses visible exclusions and rewrites", () => {
        const g = configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {
                showExclusions: true,
                showRewrites: true,
                exclusions: [{id: "e", match: "'a'"}],
                rewrites: [{id: "w", match: "'a'", replace: "'b'"}],
            }),
        ]))!
        expect(g.rules[0].exclusions).toEqual([makeAtom("a")])
        expect(g.rules[0].rewrites).toEqual([[makeAtom("a"), makeAtom("b")]])
    })

    it("reports the rule name for a syntax error in a pattern", () => {
        expect(() => configToGrammar(makeConfig("Bad", [makeRule("Bad", ["'oops"])]))).toThrow(/Bad/)
    })

    it("reports the rule name for a syntax error in an exclusion or rewrite", () => {
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showExclusions: true, exclusions: [{id: "e", match: "["}]}),
        ]))).toThrow(/'R'/)
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showRewrites: true, rewrites: [{id: "w", match: "'a'", replace: "(("}]}),
        ]))).toThrow(/'R'/)
    })

    it("rejects a non-numeric match index, naming the rule", () => {
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showRewrites: true, rewrites: [{id: "w", match: "'a'", replace: "#x#"}]}),
        ]))).toThrow(/Invalid match index.*'R'/)
    })

    it("rejects a match index beyond a fixed-shape pattern, naming the rule", () => {
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showRewrites: true, rewrites: [{id: "w", match: "'a'.'b'", replace: "#2#"}]}),
        ]))).toThrow(/Match #2# is out of range \(rule : 'R'\)/)
    })

    it("rejects references to unknown rules, naming the missing and the containing rule", () => {
        expect(() => configToGrammar(makeConfig("R", [makeRule("R", ["Missing"])])))
            .toThrow("Unknown rule 'Missing' (rule : 'R')")
        expect(() => configToGrammar(makeConfig("A", [makeRule("A", ["'a'"]), makeRule("B", ["'b'.Nope"])])))
            .toThrow("Unknown rule 'Nope' (rule : 'B')")
    })

    it.each(["1abc", "a-b", "a b"])("rejects invalid rule name %j", (name) => {
        expect(() => configToGrammar(makeConfig(name, [makeRule(name, ["'a'"])]))).toThrow(/Invalid rule name/)
    })

    it("rejects non-terminal rules without patterns, naming the rule", () => {
        expect(() => configToGrammar(makeConfig("Empty", [makeRule("Empty", [])]))).toThrow(/Empty/)
    })

    describe("error location", () => {
        const failure = (config: ReturnType<typeof makeConfig>): GrammarError => {
            try {
                configToGrammar(config)
            } catch (e) {
                return e as GrammarError
            }
            throw new Error("expected a GrammarError")
        }

        it("points at the pattern with a syntax error", () => {
            const e = failure(makeConfig("R", [makeRule("R", ["'a'", "'oops"])]))
            expect(e).toBeInstanceOf(GrammarError)
            expect([e.ruleId, e.itemId]).toEqual(["R", "R1"])
        })

        it("points at the exclusion or rewrite with an error", () => {
            const bad = makeRule("R", ["'a'"], {showExclusions: true, exclusions: [{id: "x", match: "("}]})
            expect(failure(makeConfig("R", [bad])).itemId).toBe("x")
            const rw = makeRule("R", ["'a'"], {showRewrites: true, rewrites: [{id: "w", match: "'a'", replace: "#2#"}]})
            expect(failure(makeConfig("R", [rw])).itemId).toBe("w")
        })

        it("points at the rule itself when no single item is at fault", () => {
            const e = failure(makeConfig("A", [makeRule("A", ["'a'"]), makeRule("B", ["Nope"])]))
            expect([e.ruleId, e.itemId]).toEqual(["B", undefined])
            expect(failure(makeConfig("Empty", [makeRule("Empty", [])])).ruleId).toBe("Empty")
        })
    })
})
