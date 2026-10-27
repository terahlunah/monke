import {describe, expect, it} from "vitest"
import {Parser} from "./pattern.ts"
import {makeAtom, makeBoundary, makeChoice, makeMatch, makeRange, makeRef, makeSeq, makeWeighted, makeWeightedChoice} from "./grammar.ts"

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

    it("parses feature filters on references", () => {
        expect(parse("V<front>")).toEqual(makeRef("V", [{value: "front", negate: false}]))
        expect(parse("V < front , !round >.C")).toEqual(makeSeq([
            makeRef("V", [{value: "front", negate: false}, {value: "round", negate: true}]),
            makeRef("C"),
        ]))
        expect(parse("[V<!back>]{2}")).toEqual(makeRange(makeRef("V", [{value: "back", negate: true}]), 2, 2))
    })

    it.each([
        ["V<>", /Expected a feature value name/],
        ["V<front", /Expected `,` or `>`/],
        ["V<front,>", /Expected a feature value name/],
        ["V<!>", /Expected a feature value name/],
        ["V<1a>", /Expected a feature value name/],
    ])("rejects the malformed filter %s", (src, message) => {
        expect(() => parse(src)).toThrow(message)
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

    it("parses word boundaries", () => {
        expect(parse("^.'a'.$")).toEqual(makeSeq([makeBoundary("start"), makeAtom("a"), makeBoundary("end")]))
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

describe("pattern error hints", () => {
    it("gives the character position of a parse error", () => {
        expect(() => parse("'a'.]")).toThrow("Unexpected character `]` (rule : 'R') at character 5")
    })

    it.each([
        ["C V", "Missing `.` between `C` and `V`? (rule : 'R') at character 3"],
        ["'ka''na'", "Missing `.` between `'ka'` and `'na'`? (rule : 'R') at character 5"],
        ["C.V'n'", "Missing `.` between `V` and `'n'`? (rule : 'R') at character 4"],
        ["[C / S]V", "Missing `.` between `[C / S]` and `V`? (rule : 'R') at character 8"],
        ["(C) Vowel", "Missing `.` between `(C)` and `Vowel`? (rule : 'R') at character 5"],
    ])("suggests a missing dot in %j", (src, message) => {
        expect(() => parse(src)).toThrow(message)
    })

    it("does not flag operators after a term", () => {
        for (const src of ["C.V", "C / V", "C*2 / V", "(C*0.5)", "C{2}.V", "[C].V"]) expect(() => parse(src)).not.toThrow()
    })
})

describe("repeat factors", () => {
    it("parses `~F` after an alternative, after its weight", () => {
        expect(parse("'a'*2~0.5 / 'b'~0 / 'c'")).toEqual(makeWeightedChoice([
            {...makeWeighted(makeAtom("a"), 2), repeat: 0.5},
            {...makeWeighted(makeAtom("b"), 1), repeat: 0},
            makeWeighted(makeAtom("c"), 1),
        ]))
    })

    it("rejects a weight written after the repeat factor", () => {
        expect(() => parse("'a'~0.5*2 / 'b'")).toThrow("Write the weight before the repeat factor, as in `x*2~0.5` (rule : 'R') at character 8")
    })

    it("rejects a missing or negative factor", () => {
        expect(() => parse("'a'~ / 'b'")).toThrow("Invalid repeat factor")
        expect(() => parse("'a'~-1 / 'b'")).toThrow("Invalid repeat factor")
    })
})
