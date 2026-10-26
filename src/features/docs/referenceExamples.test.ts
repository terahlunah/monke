import {describe, expect, it} from "vitest"
import {configToGrammar} from "@/engine/buildGrammar.ts"
import {generate} from "@/engine/generate.ts"
import {matchesExclusion} from "@/engine/match.ts"
import {parsePattern} from "@/engine/pattern.ts"
import {mulberry32} from "@/engine/test-helpers.ts"
import {exampleToConfig, ExampleRule, exclusionDemos, firstGrammar, ReferenceExample, recipes, rewriteDemos, syntaxRows} from "./referenceExamples.ts"

const grammarOf = (example: ReferenceExample) => {
    const grammar = configToGrammar(exampleToConfig(example))
    if (!grammar) throw new Error("no grammar")
    return grammar
}

const sample = (example: ReferenceExample, n = 300) => {
    const grammar = grammarOf(example)
    const rng = mulberry32(1)
    return Array.from({length: n}, () => generate(grammar, rng))
}

const demo = (rules: ExampleRule[], repeatRewrites = false): ReferenceExample =>
    ({id: "demo", title: "demo", root: "Demo", rules, repeatRewrites})

describe("reference syntax table", () => {
    it.each(syntaxRows)("$syntax: $example parses and generates", ({example}) => {
        expect(() => parsePattern("Demo", example)).not.toThrow()
        const words = sample(demo([...firstGrammar.rules, {name: "Demo", items: [example]}]), 20)
        expect(words.every(w => w.length > 0)).toBe(true)
    })

    it("documents escapes accurately", () => {
        const [word] = sample(demo([{name: "Demo", items: ["'it\\'s'.'a\\\\b'"]}]), 1)
        expect(word).toBe("it'sa\\b")
    })

    it("documents that a choice inside an optional needs a group", () => {
        expect(() => parsePattern("Demo", "('n' / 's')")).toThrow()
        expect(() => parsePattern("Demo", "(['n' / 's'])")).not.toThrow()
    })
})

describe("reference rewrite demos", () => {
    it.each(rewriteDemos)("$input becomes $output", ({rewrites, input, output, rules = [], repeat}) => {
        const words = sample(demo([...rules, {name: "Demo", items: [`'${input}'`], rewrites}], repeat), 5)
        expect(new Set(words)).toEqual(new Set([output]))
    })

    it("documents that a growing rewrite fails when repeated", () => {
        const growing = rewriteDemos.find(d => d.input === "ba")!
        const example = demo([{name: "Demo", items: ["'ba'"], rewrites: growing.rewrites}], true)
        expect(() => sample(example, 1)).toThrow(/did not settle/)
    })
})

describe("reference exclusion demos", () => {
    it.each(exclusionDemos)("$exclusion on $input: rejected=$rejected", ({exclusion, input, rejected, rules = []}) => {
        const grammar = grammarOf(demo([...rules, {name: "Demo", items: ["''"], exclusions: [exclusion]}]))
        expect(matchesExclusion(grammar, grammar.ruleMap.get("Demo")!, input)).toBe(rejected)
    })
})

describe("reference grammars", () => {
    it.each([firstGrammar, ...recipes])("$title generates without error", example => {
        const words = sample(example)
        expect(words.every(w => w.length > 0)).toBe(true)
    })

    const words = (id: string) => sample(recipes.find(r => r.id === id)!)

    it("banning sequences never produces a banned sequence", () => {
        for (const w of words("banned")) expect(w).not.toMatch(/ji|wu|wo|nn|nm/)
    })

    it("word-final restriction keeps n and s at the end", () => {
        for (const w of words("final")) expect(w).toMatch(/^([ptksmnl][aeiou])+[ns]?$/)
    })

    it("avoiding repeated consonants rejects CVC with the same consonant", () => {
        for (const w of words("no-repeats")) expect(w).not.toMatch(/([ptkm])[aeiou]\1/)
    })

    it("the Awkwords translation filters only the second vowel pair", () => {
        const ws = words("awkwords")
        for (const w of ws) expect(w).toMatch(/^[aiu]{2}t([aiu])(?!\1)[aiu]$/)
        expect(ws.some(w => w[0] === w[1])).toBe(true)
    })
})
