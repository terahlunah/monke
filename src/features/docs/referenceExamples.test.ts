import {describe, expect, it} from "vitest"
import {configToGrammar} from "@/engine/buildGrammar.ts"
import {generate} from "@/engine/generate.ts"
import {matchesExclusion} from "@/engine/match.ts"
import {parsePattern} from "@/engine/pattern.ts"
import {mulberry32} from "@/engine/test-helpers.ts"
import {importAwkwords} from "@/engine/awkwords.ts"
import {enumerate} from "@/engine/enumerate.ts"
import {seededRng} from "@/engine/seed.ts"
import {awkwordsImportDemo, branchingExample, exampleToConfig, ExampleRule, featureErrorDemos, filterExample, harmonyExample, twoFeaturesExample, errorHintDemos, exclusionDemos, firstGrammar, listAllDemo, seedDemo, ReferenceExample, recipes, rewriteDemos, syntaxRows} from "./referenceExamples.ts"

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

    it("word edges never end in h or start with ŋ", () => {
        const ws = words("edges")
        for (const w of ws) expect(w).not.toMatch(/^ŋ|h$/)
        expect(ws.some(w => w.includes("ŋ"))).toBe(true)
        expect(ws.some(w => /[ptkmnŋ]$/.test(w))).toBe(true)
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

describe("Awkwords import demo", () => {
    it("matches what the importer produces and keeps only ab", () => {
        const {config} = importAwkwords(awkwordsImportDemo.awkwords)
        const helper = config.rules.find(r => r.name === awkwordsImportDemo.rule)!
        expect(helper.patterns.map(p => p.pattern)).toEqual(awkwordsImportDemo.patterns.map(p => `'${p}'`))
        expect(helper.exclusions.map(e => e.match)).toEqual([awkwordsImportDemo.exclusion])
        const grammar = configToGrammar(config)!
        const rng = mulberry32(3)
        expect(new Set(Array.from({length: 50}, () => generate(grammar, rng)))).toEqual(new Set(["ab"]))
    })
})

describe("Generate all demo", () => {
    it("lists exactly the documented words", () => {
        expect(enumerate(grammarOf(listAllDemo.example))).toEqual({words: listAllDemo.words, truncated: false})
    })
})

describe("seed demo", () => {
    it("gives the documented words for the seed", () => {
        const grammar = grammarOf(firstGrammar)
        const rng = seededRng(seedDemo.seed)
        expect(seedDemo.words.map(() => generate(grammar, rng))).toEqual(seedDemo.words)
    })
})

describe("error hint demos", () => {
    it.each(errorHintDemos)("$pattern reports $message", ({pattern, message}) => {
        const rules = firstGrammar.rules.map(r => r.name === "Word" ? {...r, items: [pattern]} : r)
        expect(() => grammarOf({...firstGrammar, rules})).toThrow(message)
    })
})

describe("phonological feature examples", () => {
    const mixes = (w: string) => /[ei]/.test(w) && /[ou]/.test(w)

    it("vowel harmony never mixes front and back vowels, and a goes with both", () => {
        const ws = sample(harmonyExample, 1000)
        expect(ws.filter(mixes)).toEqual([])
        expect(ws.some(w => /a/.test(w) && /[ei]/.test(w))).toBe(true)
        expect(ws.some(w => /a/.test(w) && /[ou]/.test(w))).toBe(true)
    })

    it("harmony and rounding: y only with front round vowels, a only with flat ones", () => {
        const vowelsOf = (w: string) => w.replace(/[^aeiouy]/g, "")
        for (const w of sample(twoFeaturesExample, 1000).map(vowelsOf)) {
            expect(w).toMatch(/^([aei]+|[y]+|[a]+|[ou]+)$/)
        }
    })

    it("nouns end in n or nothing, verbs in la or nothing, nouns twice as often", () => {
        const ws = sample(branchingExample, 3000)
        for (const w of ws) expect(w).toMatch(/^([ptksmnlwj][aeiou]){2}(n|la)?$/)
        const nouns = ws.filter(w => w.endsWith("n") && !w.endsWith("la")).length
        const verbs = ws.filter(w => w.endsWith("la")).length
        expect(nouns / verbs).toBeGreaterThan(1.5)
    })

    it("filters alone keep front vowels out of the first syllable and back ones out of the last", () => {
        const ws = sample(filterExample, 500)
        for (const w of ws) expect(w).toMatch(/^[ptksmnlwj][aou][ptksmnlwj][aei]$/)
        expect(new Set(ws.map(w => w[1]))).toEqual(new Set("aou"))
    })

    it("vowel harmony is offered in the Examples menu as a recipe", () => {
        expect(recipes).toContain(harmonyExample)
    })

    it.each(featureErrorDemos)("$pattern reports $message", ({pattern, chooses, message}) => {
        const rules = harmonyExample.rules.map(r => r.name === "Word" ? {...r, items: [pattern], chooses: chooses ? ["harmony"] : undefined} : r)
        expect(() => grammarOf({...harmonyExample, rules})).toThrow(message)
    })
})
