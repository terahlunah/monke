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

    describe("back-references in matches", () => {
        const exclusionOn = (exclusion: string) => {
            const g = makeGrammar("R", [makeRule("R", ["''"], {
                showExclusions: true,
                exclusions: [{id: "e", match: exclusion}],
            }), makeRule("C", ["p", "t", "pt"], {terminalOnly: true}), makeRule("V", ["a", "i"], {terminalOnly: true})])
            return (text: string) => matchesExclusion(g, g.ruleMap.get("R")!, text)
        }

        it("excludes a doubled consonant but not two different ones", () => {
            const doubled = exclusionOn("C.#0#")
            expect([doubled("appa"), doubled("atta"), doubled("apta"), doubled("ap")]).toEqual([true, true, false, false])
        })

        it("backtracks into the referenced part to find a repeat", () => {
            // C first tries 'p', which is not repeated; only 'pt' followed by 'pt' matches.
            expect(exclusionOn("C.#0#")("aptpt")).toBe(true)
        })

        it("refers to top-level parts from inside a group", () => {
            const repeat = exclusionOn("C.V.[#0# / 'h']")
            expect([repeat("papa"), repeat("pah"), repeat("pata")]).toEqual([true, true, false])
        })

        it("matches back-references in rewrite matches", () => {
            const g = makeGrammar("R", [makeRule("R", ["'appatta'"], {
                showRewrites: true,
                rewrites: [{id: "w", match: "C.#0#", replace: "#0#"}],
            }), makeRule("C", ["p", "t"], {terminalOnly: true})])
            expect(generate(g)).toBe("apata")
        })
    })

    describe("word boundaries", () => {
        const withRewrite = (pattern: string, match: string, replace: string) => makeGrammar("R", [makeRule("R", [pattern], {
            showRewrites: true,
            rewrites: [{id: "w", match, replace}],
        }), makeRule("V", ["'a' / 'o'"])])

        it("rewrites only at the start of the output", () => {
            expect(generate(withRewrite("'ŋaŋa'", "^.'ŋ'", "'n'"))).toBe("naŋa")
        })

        it("rewrites only at the end of the output", () => {
            expect(generate(withRewrite("'haha'", "'a'.$", "'e'"))).toBe("hahe")
        })

        it("counts a boundary as an empty back-reference part", () => {
            expect(generate(withRewrite("'ŋoŋa'", "^.'ŋ'.V", "'n'.#2#.#0#"))).toBe("noŋa")
        })

        it("does not match a lone boundary, since it is empty", () => {
            expect(generate(withRewrite("'ab'", "$", "'x'"))).toBe("ab")
        })

        const exclusionOn = (exclusion: string) => {
            const g = makeGrammar("R", [makeRule("R", ["''"], {
                showExclusions: true,
                exclusions: [{id: "e", match: exclusion}],
            })])
            return (text: string) => matchesExclusion(g, g.ruleMap.get("R")!, text)
        }

        it("excludes only at the edges", () => {
            const final = exclusionOn("'h'.$")
            expect([final("bah"), final("bha"), final("h")]).toEqual([true, false, true])
            const initial = exclusionOn("^.'h'")
            expect([initial("hab"), initial("bha")]).toEqual([true, false])
        })

        it("refers to the edges of the rule's own output, not of the whole word", () => {
            const g = makeGrammar("Word", [
                makeRule("Word", ["Syl.Syl"]),
                makeRule("Syl", ["'ka' / 'ha'"], {showExclusions: true, exclusions: [{id: "e", match: "^.'h'"}]}),
            ])
            expect(new Set(sample(g))).toEqual(new Set(["kaka"]))
        })
    })

    describe("repeated rewrites", () => {
        // Rewrite 2 creates an 'np' that rewrite 1 only sees on a later pass.
        const feeding = (repeatRewrites: boolean) => makeGrammar("R", [makeRule("R", ["'anepa'"], {
            showRewrites: true,
            rewrites: [{id: "a", match: "'n'.'p'", replace: "'m'.#1#"}, {id: "b", match: "'e'", replace: "''"}],
        })], {repeatRewrites})

        it("runs the list once when off", () => {
            expect(generate(feeding(false))).toBe("anpa")
        })

        it("repeats the list until the output settles when on", () => {
            expect(generate(feeding(true))).toBe("ampa")
        })

        it("still does not rewrite just-inserted text within a pass", () => {
            const g = makeGrammar("R", [makeRule("R", ["'xxx'"], {
                showRewrites: true,
                rewrites: [{id: "a", match: "'xx'", replace: "'x'"}],
            })], {repeatRewrites: true})
            expect(generate(g)).toBe("x")
        })

        it("fails with a clear error when rewrites ping-pong past the cap", () => {
            const g = makeGrammar("R", [makeRule("R", ["'a'"], {
                showRewrites: true,
                // Each pass swaps a and b (through c), so the output alternates forever.
                rewrites: [
                    {id: "a", match: "'a'", replace: "'c'"},
                    {id: "b", match: "'b'", replace: "'a'"},
                    {id: "c", match: "'c'", replace: "'b'"},
                ],
            })], {repeatRewrites: true})
            expect(() => generate(g)).toThrow("Rewrites of rule 'R' did not settle after 32 passes")
        })

        it("fails quickly when a rewrite keeps growing the output", () => {
            const g = makeGrammar("R", [makeRule("R", ["'a'"], {
                showRewrites: true,
                rewrites: [{id: "a", match: "'a'", replace: "'aa'"}],
            })], {repeatRewrites: true})
            expect(() => generate(g)).toThrow(/Rewrites of rule 'R' did not settle: the output grew past/)
        })
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

describe("repeat factors", () => {
    const words = (g: Parameters<typeof generate>[0]) => sample(g, 200)
    const count = (w: string, c: string) => w.split(c).length - 1

    it("lowers an alternative's weight for each earlier pick of it in the word", () => {
        const g = makeGrammar("W", [makeRule("W", ["C{3}"]), makeRule("C", ["'a'~0 / 'b'"])], {enableWeights: true})
        const ws = words(g)
        expect(ws.every(w => count(w, "a") <= 1)).toBe(true)
        expect(ws.some(w => w.includes("a"))).toBe(true)
    })

    it("lowers the weight of references to a rule for each earlier expansion of it", () => {
        const g = makeGrammar("W", [
            makeRule("W", ["[V / 'b']{4}"]),
            makeRule("V", ["a", "e"], {terminalOnly: true, repeatWeight: 0}),
        ], {enableWeights: true})
        const ws = words(g)
        expect(ws.every(w => count(w, "a") + count(w, "e") <= 1)).toBe(true)
        expect(ws.some(w => /[ae]/.test(w))).toBe(true)
    })

    it("counts per word", () => {
        const g = makeGrammar("W", [makeRule("W", ["'a'~0 / 'b'*0.000001"])], {enableWeights: true})
        expect(words(g).every(w => w === "a")).toBe(true)
    })

    it("forgets the picks of attempts rejected by an exclusion", () => {
        const g = makeGrammar("W", [
            makeRule("W", ["C.Z"], {showExclusions: true, exclusions: [{id: "x", match: "'ax'"}]}),
            makeRule("C", ["'a'~0 / 'b'*0.000001"]),
            makeRule("Z", ["'x' / 'y'"]),
        ], {enableWeights: true})
        expect(words(g).every(w => w === "ay")).toBe(true)
    })

    it("has no effect when weights are off", () => {
        const g = makeGrammar("W", [makeRule("W", ["C{3}"]), makeRule("C", ["'a'~0 / 'b'"])])
        expect(words(g).some(w => count(w, "a") > 1)).toBe(true)
    })

    it("draws the same random numbers as without factors", () => {
        const rules = (p: string, repeatWeight?: number) => [makeRule("W", ["[C / V]{2:5}"]), makeRule("C", [p], {repeatWeight}), makeRule("V", ["'a' / 'e'"])]
        const plain = makeGrammar("W", rules("'p'*2 / 't'"), {enableWeights: true})
        const neutral = makeGrammar("W", rules("'p'*2~1 / 't'~1", 1), {enableWeights: true})
        expect(words(neutral)).toEqual(words(plain))
    })
})
