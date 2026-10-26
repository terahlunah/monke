import {describe, expect, it} from "vitest"
import {generate} from "./generate.ts"
import {countCombinations, detectCycle} from "./analysis.ts"
import {matchesExclusion} from "./match.ts"
import {makeGrammar, makeRule, mulberry32, sequenceRng} from "./test-helpers.ts"
import {tokiPonaRoot, tokiPonaRules} from "./defaults.ts"

// Exact-pick tests pass sequenceRng: every rule consumes one value for its own pattern choice before its contents.
const sample = (g: Parameters<typeof generate>[0], n = 300) => {
    const rng = mulberry32(1)
    return Array.from({length: n}, () => generate(g, rng))
}

describe("generate", () => {
    it("expands sequences of atoms", () => {
        expect(generate(makeGrammar("R", [makeRule("R", ["'a'.'b'.'c'"])]))).toBe("abc")
    })

    it("follows references", () => {
        const g = makeGrammar("R", [makeRule("R", ["V.V"]), makeRule("V", ["'a'"])])
        expect(generate(g)).toBe("aa")
    })

    it("picks choices uniformly when weights are off", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a' / 'b' / 'c'"])])
        const rng = sequenceRng(0, 0, 0, 0.5, 0, 0.99)
        expect([generate(g, rng), generate(g, rng), generate(g, rng)]).toEqual(["a", "b", "c"])
    })

    it("ignores weights when disabled", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'*100 / 'b'*0"])])
        expect(generate(g, sequenceRng(0.9))).toBe("b")
    })

    it("honors weights when enabled", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'*1 / 'b'*3"])], {enableWeights: true})
        const rng = sequenceRng(0, 0.1, 0, 0.3, 0, 0.9)
        expect([generate(g, rng), generate(g, rng), generate(g, rng)]).toEqual(["a", "b", "b"])
    })

    it("never picks zero-weight choices", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'*0 / 'b'"])], {enableWeights: true})
        expect(new Set(sample(g))).toEqual(new Set(["b"]))
    })

    it("applies per-pattern rule weights", () => {
        const rule = makeRule("R", ["'a'", "'b'"])
        rule.patterns[0].weight = 0
        const g = makeGrammar("R", [rule], {enableWeights: true})
        expect(new Set(sample(g))).toEqual(new Set(["b"]))
    })

    it("handles optionals", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'.('b')"])], {enableWeights: true})
        const rng = sequenceRng(0, 0.2, 0, 0.8)
        expect([generate(g, rng), generate(g, rng)]).toEqual(["ab", "a"])
    })

    it("only emits optionals when weights allow, over many samples", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'.('b'*0.3)"])], {enableWeights: true})
        const words = sample(g, 500)
        expect(new Set(words)).toEqual(new Set(["a", "ab"]))
        const withB = words.filter(w => w === "ab").length
        expect(withB).toBeGreaterThan(50)
        expect(withB).toBeLessThan(250)
    })

    it("repeats a fixed quantifier exactly", () => {
        expect(generate(makeGrammar("R", [makeRule("R", ["'ab'{3}"])]))).toBe("ababab")
    })

    it("keeps ranged quantifiers within bounds and reaches both ends", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'{1:3}"])])
        expect(new Set(sample(g))).toEqual(new Set(["a", "aa", "aaa"]))
    })

    it("allows a zero lower bound", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'{:1}"])])
        expect(new Set(sample(g))).toEqual(new Set(["", "a"]))
    })

    it("never outputs strings matching an exclusion", () => {
        const g = makeGrammar("R", [makeRule("R", ["C{2}"], {
            showExclusions: true,
            exclusions: [{id: "e", match: "'a'.'a'"}],
        }), makeRule("C", ["'a' / 'b'"])])
        const words = sample(g)
        expect(words).not.toContain("aa")
        expect(new Set(words)).toEqual(new Set(["ab", "ba", "bb"]))
    })

    it("matches exclusions against substrings", () => {
        const g = makeGrammar("R", [makeRule("R", ["C{3}"], {
            showExclusions: true,
            exclusions: [{id: "e", match: "'b'"}],
        }), makeRule("C", ["'a' / 'b'"])])
        expect(new Set(sample(g))).toEqual(new Set(["aaa"]))
    })

    // Issue #22: a shorter alternative listed first ('b') must not hide a longer one ('bb') that completes the match.
    it("explores every alternative of a referenced choice when matching exclusions", () => {
        const g = makeGrammar("Word", [
            makeRule("Choice", ["b", "bb", "cc", "c"], {terminalOnly: true}),
            makeRule("Word", ["'abba'", "'acca'"], {
                showExclusions: true,
                exclusions: [{id: "e", match: "'a'.Choice.'a'"}],
            }),
        ])
        const word = g.ruleMap.get("Word")!
        expect(matchesExclusion(g, word, "abba")).toBe(true)
        expect(matchesExclusion(g, word, "acca")).toBe(true)
        expect(matchesExclusion(g, word, "abca")).toBe(false)
        expect(() => generate(g)).toThrow(/too restrictive/)
    })

    it("fails when exclusions rule out everything", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'"], {
            showExclusions: true,
            exclusions: [{id: "e", match: "'a'"}],
        })])
        expect(() => generate(g)).toThrow(/too restrictive/)
    })

    it("applies rewrites", () => {
        const g = makeGrammar("R", [makeRule("R", ["'aXb'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'X'", replace: "'-'"}],
        })])
        expect(generate(g)).toBe("a-b")
    })

    it("rewrites every occurrence", () => {
        const g = makeGrammar("R", [makeRule("R", ["'xaxbx'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'x'", replace: "'y'"}],
        })])
        expect(generate(g)).toBe("yayby")
    })

    it("substitutes back-references in rewrites", () => {
        // Doubles the vowel following a 'k'.
        const g = makeGrammar("R", [makeRule("R", ["'kat'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'k'.V", replace: "#0#.#1#.#1#"}],
        }), makeRule("V", ["'a'"])])
        expect(generate(g)).toBe("kaat")
    })

    it("lets rewrite matches span choices and swap parts", () => {
        const g = makeGrammar("R", [makeRule("R", ["'ta' / 'ti'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'t'.V", replace: "#1#.#0#"}],
        }), makeRule("V", ["'a' / 'i'"])])
        expect(new Set(sample(g))).toEqual(new Set(["at", "it"]))
    })

    it("matches rewrite patterns containing a multi-part reference", () => {
        const g = makeGrammar("R", [makeRule("R", ["'abc'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "P.'c'", replace: "'X'"}],
        }), makeRule("P", ["'a'.'b'"])])
        expect(generate(g)).toBe("X")
    })

    it("treats a nested sequence as one back-reference", () => {
        const g = makeGrammar("R", [makeRule("R", ["'xabc'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'x'.P.'c'", replace: "#2#.#1#.#0#"}],
        }), makeRule("P", ["'a'.'b'"])])
        expect(generate(g)).toBe("cabx")
    })

    it("terminates when a rewrite pattern can match empty", () => {
        const g = makeGrammar("R", [makeRule("R", ["'bab'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "('a')", replace: "'x'"}],
        })])
        expect(generate(g)).toBe("bxb")
    })

    it("does not rewrite its own replacement output", () => {
        const g = makeGrammar("R", [makeRule("R", ["'aa'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'a'", replace: "'aa'"}],
        })])
        expect(generate(g)).toBe("aaaa")
    })

    it("allows optional items to match empty inside a sequence", () => {
        const g = makeGrammar("R", [makeRule("R", ["'tb'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'t'.('a').'b'", replace: "'X'"}],
        })])
        expect(generate(g)).toBe("X")
    })

    it("backtracks into earlier choices of a sequence", () => {
        const g = makeGrammar("R", [makeRule("R", ["'abc'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "['a' / 'ab'].'c'", replace: "'X'"}],
        })])
        expect(generate(g)).toBe("X")
    })

    it("emits nothing for a back-reference a variable-shape pattern did not produce", () => {
        const g = makeGrammar("R", [makeRule("R", ["'ab'"], {
            showRewrites: true,
            rewrites: [{id: "w", match: "'a'{1:2}", replace: "#0#.#5#.'-'"}],
        })])
        expect(generate(g)).toBe("a-b")
    })

    it("generates from the default Toki Pona grammar", () => {
        const g = makeGrammar(tokiPonaRoot, tokiPonaRules)
        const words = sample(g, 200)
        for (const w of words) expect(w).toMatch(/^[a-z]+$/)
        expect(new Set(words).size).toBeGreaterThan(20)
    })
})

describe("countCombinations", () => {
    it("counts atoms as 1", () => {
        expect(countCombinations(makeGrammar("R", [makeRule("R", ["'a'"])]))).toBe(1)
    })

    it("sums choices and multiplies sequences", () => {
        const g = makeGrammar("R", [
            makeRule("R", ["C.V"]),
            makeRule("C", ["'p' / 't' / 'k'"]),
            makeRule("V", ["'a' / 'i'"]),
        ])
        expect(countCombinations(g)).toBe(6)
    })

    it("counts optionals as two branches", () => {
        expect(countCombinations(makeGrammar("R", [makeRule("R", ["'a'.('b')"])]))).toBe(2)
    })

    it("counts quantifiers as the sum of powers over the range", () => {
        const g = makeGrammar("R", [makeRule("R", ["[C]{1:3}"]), makeRule("C", ["'a' / 'b'"])])
        expect(countCombinations(g)).toBe(2 + 4 + 8)
    })

    it("counts multiple patterns in a rule as alternatives", () => {
        expect(countCombinations(makeGrammar("R", [makeRule("R", ["'a'", "'b'.'c'"])]))).toBe(2)
    })
})

describe("detectCycle", () => {
    it("returns nothing for acyclic grammars", () => {
        const g = makeGrammar("R", [makeRule("R", ["A.B"]), makeRule("A", ["B"]), makeRule("B", ["'x'"])])
        expect(detectCycle(g) ?? []).toHaveLength(0)
    })

    it("finds direct self-reference", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a' / R"])])
        expect(detectCycle(g)).toBeTruthy()
    })

    it("finds indirect cycles", () => {
        const g = makeGrammar("R", [makeRule("R", ["A"]), makeRule("A", ["B"]), makeRule("B", ["(R)"])])
        expect(detectCycle(g)).toBeTruthy()
    })

    it("ignores cycles unreachable from the root", () => {
        const g = makeGrammar("R", [makeRule("R", ["'a'"]), makeRule("X", ["X / 'a'"])])
        expect(detectCycle(g) ?? []).toHaveLength(0)
    })
})
