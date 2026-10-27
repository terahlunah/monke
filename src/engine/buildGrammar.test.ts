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
        expect(g.rules[0].expr).toMatchObject(choice([makeAtom("a.b"), makeAtom("(x)")]))
    })

    it("carries pattern weights and the weights flag", () => {
        const rule = makeRule("R", ["'a'"])
        rule.patterns[0].weight = 4
        const g = configToGrammar(makeConfig("R", [rule], {enableWeights: true}))!
        expect(g.useWeights).toBe(true)
        expect(g.rules[0].expr).toMatchObject(makeWeightedChoice([makeWeighted(makeAtom("a"), 4)]))
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

    it("suggests a rule name within two edits and flags the pattern using the unknown name", () => {
        const config = makeConfig("Word", [makeRule("Vowel", ["a"], {terminalOnly: true}), makeRule("Word", ["'k'.Vowel", "'t'.Vowl"])])
        let error: unknown
        try {
            configToGrammar(config)
        } catch (e) {
            error = e
        }
        expect(error).toBeInstanceOf(GrammarError)
        expect((error as GrammarError).message).toBe("Unknown rule 'Vowl' (rule : 'Word'). Did you mean `Vowel`?")
        expect((error as GrammarError).itemId).toBe(config.rules[1].patterns[1].id)
    })

    it("does not suggest names more than two edits away", () => {
        expect(() => configToGrammar(makeConfig("Word", [makeRule("Vowel", ["a"], {terminalOnly: true}), makeRule("Word", ["Vw"])])))
            .toThrow(/^Unknown rule 'Vw' \(rule : 'Word'\)$/)
    })

    it.each(["1abc", "a-b", "a b"])("rejects invalid rule name %j", (name) => {
        expect(() => configToGrammar(makeConfig(name, [makeRule(name, ["'a'"])]))).toThrow(/Invalid rule name/)
    })

    it("rejects a duplicate rule name, naming it", () => {
        expect(() => configToGrammar(makeConfig("A", [makeRule("A", ["'a'"]), makeRule("A", ["'b'"], {terminalOnly: true})])))
            .toThrow("Duplicate rule name 'A'")
    })

    it.each(["('a'*1.5)", "('a'*2)"])("rejects an optional probability above 1 in %s, naming the rule", (pattern) => {
        expect(() => configToGrammar(makeConfig("R", [makeRule("R", [pattern])])))
            .toThrow(/Optional probability .* must be between 0 and 1 \(rule : 'R'\)/)
    })

    it.each(["('a'*0)", "('a'*1)", "('a'*0.3)"])("accepts optional probability %s", (pattern) => {
        expect(() => configToGrammar(makeConfig("R", [makeRule("R", [pattern])]))).not.toThrow()
    })

    it.each(["#0#.'a'", "'a'.#1#", "'a'.['b'.#1#]", "#0#", "'a' / #0#"])(
        "rejects back-reference %s in an exclusion that does not refer to an earlier part", (match) => {
            expect(() => configToGrammar(makeConfig("R", [
                makeRule("R", ["'a'"], {showExclusions: true, exclusions: [{id: "e", match}]}),
            ]))).toThrow(/Match #\d+# must refer to an earlier part of the pattern \(rule : 'R'\)/)
        })

    it("rejects a back-reference to a later part in a rewrite match", () => {
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showRewrites: true, rewrites: [{id: "w", match: "#1#.'a'", replace: "'b'"}]}),
        ]))).toThrow(/must refer to an earlier part/)
    })

    it("accepts back-references to earlier parts in exclusions", () => {
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showExclusions: true, exclusions: [{id: "e", match: "'a'.'b'.[#0# / #1#]"}]}),
        ]))).not.toThrow()
    })

    it("rejects word boundaries in patterns and replacements, naming the rule", () => {
        const message = /only allowed in rewrite matches and exclusions \(rule : 'R'\)/
        expect(() => configToGrammar(makeConfig("R", [makeRule("R", ["^.'a'"])]))).toThrow(message)
        expect(() => configToGrammar(makeConfig("R", [
            makeRule("R", ["'a'"], {showRewrites: true, rewrites: [{id: "w", match: "'a'", replace: "'b'.$"}]}),
        ]))).toThrow(message)
    })

    it("accepts word boundaries in rewrite matches and exclusions", () => {
        expect(() => configToGrammar(makeConfig("R", [makeRule("R", ["'a'"], {
            showRewrites: true, rewrites: [{id: "w", match: "^.'a'", replace: "'b'"}],
            showExclusions: true, exclusions: [{id: "e", match: "'a'.$"}],
        })]))).not.toThrow()
    })

    it("treats ^ and $ in terminal rules as plain text", () => {
        const g = configToGrammar(makeConfig("T", [makeRule("T", ["^", "$"], {terminalOnly: true})]))!
        expect(g.rules[0].expr).toMatchObject(choice([makeAtom("^"), makeAtom("$")]))
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

        it("points at the pattern using an unknown rule", () => {
            const e = failure(makeConfig("A", [makeRule("A", ["'a'"]), makeRule("B", ["'b'", "Nope"])]))
            expect([e.ruleId, e.itemId]).toEqual(["B", "B1"])
        })

        it("points at the rule itself when no single item is at fault", () => {
            expect(failure(makeConfig("Empty", [makeRule("Empty", [])])).ruleId).toBe("Empty")
        })

        it("points at the name of the second rule sharing a name", () => {
            const second = {...makeRule("A", ["'b'"]), id: "second"}
            const e = failure(makeConfig("A", [makeRule("A", ["'a'"]), second]))
            expect([e.ruleId, e.itemId]).toEqual(["second", undefined])
        })
    })

    it("carries rule repeat weights other than 1 and rejects negative ones on the rule's control", () => {
        const g = configToGrammar(makeConfig("A", [makeRule("A", ["B"], {repeatWeight: 1}), makeRule("B", ["'b'"], {repeatWeight: 0.5})]))!
        expect(g.ruleMap.get("A")!.repeat).toBeUndefined()
        expect(g.ruleMap.get("B")!.repeat).toBe(0.5)
        const bad = () => configToGrammar(makeConfig("A", [makeRule("A", ["'a'"], {repeatWeight: -1})]))
        expect(bad).toThrow("Invalid repeat weight -1: it must be a number of at least 0 (rule : 'A')")
        expect(bad).toThrow(expect.objectContaining({ruleId: "A", itemId: "rule-repeat"}))
    })
})
