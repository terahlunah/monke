import {describe, expect, it} from "vitest"
import {configToGrammar, Parser} from "./parser.ts"
import {makeAtom, makeChoice, makeMatch, makeRange, makeRef, makeSeq, makeWeighted, makeWeightedChoice} from "../models/grammar.ts"
import {makeConfig, makeRule} from "../test-helpers.ts"

const parse = (src: string) => new Parser("R", src).parse()
const choice = makeChoice

describe("pattern syntax", () => {
    it("parses atoms", () => {
        expect(parse("'ab'")).toEqual(makeAtom("ab"))
        expect(parse("''")).toEqual(makeAtom(""))
    })

    it("parses escaped quotes and backslashes in atoms", () => {
        expect(parse("'it\\'s'")).toEqual(makeAtom("it's"))
        expect(parse("'a\\\\b'")).toEqual(makeAtom("a\\b"))
    })

    it("escapes only the character right after a backslash", () => {
        expect(parse("'\\ab'")).toEqual(makeAtom("ab"))
        expect(parse("'\\a\\'b'")).toEqual(makeAtom("a'b"))
    })

    it("gives unweighted choice items the default weight", () => {
        expect(makeChoice([makeAtom("a"), makeAtom("b"), makeAtom("c")])).toEqual(makeWeightedChoice([
            makeWeighted(makeAtom("a"), 1),
            makeWeighted(makeAtom("b"), 1),
            makeWeighted(makeAtom("c"), 1),
        ]))
    })

    it("keeps whitespace inside atoms", () => {
        expect(parse("' a '")).toEqual(makeAtom(" a "))
    })

    it("parses references", () => {
        expect(parse("Vowel_2")).toEqual(makeRef("Vowel_2"))
    })

    it("parses sequences, ignoring whitespace between terms", () => {
        expect(parse("A . 'x' .B")).toEqual(makeSeq([makeRef("A"), makeAtom("x"), makeRef("B")]))
    })

    it("parses choices with default weight 1", () => {
        expect(parse("A / 'x'")).toEqual(choice([makeRef("A"), makeAtom("x")]))
    })

    it("parses weights on choice items, including the first", () => {
        expect(parse("A*3 / B / C*0.5")).toEqual(makeWeightedChoice([
            makeWeighted(makeRef("A"), 3),
            makeWeighted(makeRef("B"), 1),
            makeWeighted(makeRef("C"), 0.5),
        ]))
    })

    it("binds sequence tighter than choice", () => {
        expect(parse("A.B / C")).toEqual(choice([makeSeq([makeRef("A"), makeRef("B")]), makeRef("C")]))
    })

    it("parses optionals with default weight 0.5", () => {
        expect(parse("(A)")).toEqual(makeWeightedChoice([
            makeWeighted(makeRef("A"), 0.5),
            makeWeighted(makeAtom(""), 0.5),
        ]))
    })

    it("parses optionals with a custom weight", () => {
        const e = parse("(A*0.3)")
        expect(e).toEqual(makeWeightedChoice([
            makeWeighted(makeRef("A"), 0.3),
            makeWeighted(makeAtom(""), 0.7),
        ]))
    })

    it("parses groups so choices can nest inside sequences", () => {
        expect(parse("A.[B/C]")).toEqual(makeSeq([makeRef("A"), choice([makeRef("B"), makeRef("C")])]))
    })

    it("parses quantifiers", () => {
        expect(parse("A{3}")).toEqual(makeRange(makeRef("A"), 3, 3))
        expect(parse("A{1:4}")).toEqual(makeRange(makeRef("A"), 1, 4))
        expect(parse("A{:2}")).toEqual(makeRange(makeRef("A"), 0, 2))
        expect(parse("[A.B]{2}")).toEqual(makeRange(makeSeq([makeRef("A"), makeRef("B")]), 2, 2))
    })

    it("parses back-references", () => {
        expect(parse("#0#.'x'.#12#")).toEqual(makeSeq([makeMatch(0), makeAtom("x"), makeMatch(12)]))
    })

    it("parses empty input as the empty atom", () => {
        expect(parse("")).toEqual(makeAtom(""))
    })
})

describe("syntax errors", () => {
    it.each([
        ["unterminated atom", "'abc"],
        ["unexpected character", "A $"],
        ["unclosed group", "[A"],
        ["unclosed optional", "(A"],
        ["unterminated back-reference", "#1"],
        ["quantifier with max < min", "A{3:1}"],
        ["quantifier with garbage", "A{x}"],
        ["quantifier with too many parts", "A{1:2:3}"],
        ["missing weight value", "A*"],
        ["stray closing paren", "A)"],
    ])("rejects %s and names the rule", (_, src) => {
        expect(() => new Parser("MyRule", src).parse()).toThrow(/MyRule/)
    })
})

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
})
