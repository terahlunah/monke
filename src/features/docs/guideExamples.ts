import {Config, Rule} from "@/engine/config.ts";

// Guide examples live here as data so the guide renders them and guideExamples.test.ts checks them against the engine.

// A terminal or pattern, optionally with a weight (used only when weights are enabled).
export type ExampleItem = string | [text: string, weight: number]

export type ExampleRule = {
    name: string
    terminal?: boolean
    items: ExampleItem[]
    rewrites?: [match: string, replace: string][]
    exclusions?: string[]
}

export type GuideExample = {
    id: string
    title: string
    root: string
    weights?: boolean
    rules: ExampleRule[]
}

export const itemText = (item: ExampleItem): string => typeof item === "string" ? item : item[0]
export const itemWeight = (item: ExampleItem): number | null => typeof item === "string" ? null : item[1]

export const exampleToConfig = (example: GuideExample, enableSerif = false): Config => ({
    language: example.title,
    root: example.root,
    enableWeights: example.weights ?? false,
    enableSerif,
    rules: example.rules.map((r): Rule => ({
        id: crypto.randomUUID(),
        name: r.name,
        terminalOnly: r.terminal ?? false,
        patterns: r.items.map(item => ({id: crypto.randomUUID(), pattern: itemText(item), weight: itemWeight(item) ?? 1})),
        rewrites: (r.rewrites ?? []).map(([match, replace]) => ({id: crypto.randomUUID(), match, replace})),
        exclusions: (r.exclusions ?? []).map(match => ({id: crypto.randomUUID(), match})),
        showRewrites: (r.rewrites ?? []).length > 0,
        showExclusions: (r.exclusions ?? []).length > 0,
        collapsed: false,
    })),
})

const C: ExampleRule = {name: "C", terminal: true, items: ["p", "t", "k", "s", "m", "n", "l"]}
const V: ExampleRule = {name: "V", terminal: true, items: ["a", "e", "i", "o", "u"]}

export const firstGrammar: GuideExample = {
    id: "first-grammar",
    title: "First grammar",
    root: "Word",
    rules: [
        C,
        V,
        {name: "Syllable", items: ["C.V.('n')"]},
        {name: "Word", items: ["Syllable{1:3}"]},
    ],
}

export type SyntaxRow = {
    syntax: string
    meaning: string
    example: string
    output: string
}

// `example` is a real pattern; it may reference the C and V rules of firstGrammar.
export const syntaxRows: SyntaxRow[] = [
    {syntax: "'text'", meaning: "Literal text (an atom). Everything literal must be quoted.", example: "'ka'", output: "ka"},
    {syntax: "\\' and \\\\", meaning: "Inside quotes, a backslash makes the next character literal.", example: "'it\\'s'", output: "it's"},
    {syntax: "Name", meaning: "Reference: generates the rule with that name.", example: "V", output: "a, e, i, o or u"},
    {syntax: "a.b", meaning: "Sequence: a then b.", example: "C.V", output: "ka, mo, …"},
    {syntax: "a / b", meaning: "Choice: one of the alternatives.", example: "'a' / 'e'", output: "a or e"},
    {syntax: "a*N / b", meaning: "Weight of an alternative (default 1). Needs weights enabled.", example: "'a'*3 / 'e'", output: "a three times as often as e"},
    {syntax: "[x]", meaning: "Group, to put a choice inside a sequence.", example: "C.['a' / 'e']", output: "ka, se, …"},
    {syntax: "(x)", meaning: "Optional: present half of the time.", example: "C.V.('n')", output: "ka, kan, …"},
    {syntax: "(x*P)", meaning: "Optional with probability P between 0 and 1. Needs weights enabled.", example: "C.V.('n'*0.2)", output: "kan 20% of the time"},
    {syntax: "x{n}", meaning: "Exactly n repetitions.", example: "V{2}", output: "ae, oo, …"},
    {syntax: "x{min:max}", meaning: "Between min and max repetitions, each count equally likely.", example: "[C.V]{1:3}", output: "ka, kasu, kasumi, …"},
    {syntax: "x{:max}", meaning: "Same as {0:max}.", example: "'h'{:1}.V", output: "a, ha, …"},
]

// Each demo applies its rewrites, in order, to `input`; the guideExamples test checks the result is `output`.
export type RewriteDemo = {
    rewrites: [match: string, replace: string][]
    input: string
    output: string
    note: string
    rules?: ExampleRule[]
}

export const rewriteDemos: RewriteDemo[] = [
    {rewrites: [["'n'.['p' / 'b' / 'm']", "'m'.#1#"]], input: "anpa", output: "ampa", note: "Assimilation: n becomes m before p, b or m. #1# keeps the consonant that matched."},
    {rewrites: [["'k'.'s'", "#1#.#0#"]], input: "aksa", output: "aska", note: "Metathesis: swap the two matched parts."},
    {rewrites: [["'h'", "''"]], input: "ahah", output: "aa", note: "Deletion: replace with an empty atom."},
    {rewrites: [["'a'", "'aa'"]], input: "ba", output: "baa", note: "Inserted text is not rewritten again, so this does not loop."},
    {rewrites: [["'s'", "'z'"], ["'z'", "'r'"]], input: "sasa", output: "rara", note: "The second rewrite sees the output of the first."},
    {
        rewrites: [["'x'.P.'c'", "#2#.#1#.#0#"]], input: "xabc", output: "cabx",
        note: "P counts as one part, whatever it contains: #0# is x, #1# is ab, #2# is c.",
        rules: [{name: "P", items: ["'a'.'b'"]}],
    },
]

export type ExclusionDemo = {
    exclusion: string
    input: string
    rejected: boolean
    rules?: ExampleRule[]
}

export const exclusionDemos: ExclusionDemo[] = [
    {exclusion: "'ti'", input: "pati", rejected: true},
    {exclusion: "'ti'", input: "atia", rejected: true},
    {exclusion: "'ti'", input: "tapi", rejected: false},
    {exclusion: "V.V", input: "kaio", rejected: true, rules: [V]},
    {exclusion: "V.V", input: "kalo", rejected: false, rules: [V]},
]

export type Recipe = GuideExample & { summary: string }

const CJ: ExampleRule = {name: "C", terminal: true, items: ["p", "t", "k", "s", "m", "n", "l", "j", "w"]}

export const recipes: Recipe[] = [
    {
        id: "syllables",
        title: "Syllable structure (C)V(n)",
        summary: "Optional onset, required vowel, optional final n, one to three syllables.",
        root: "Word",
        rules: [C, V, {name: "Syllable", items: ["(C).V.('n')"]}, {name: "Word", items: ["Syllable{1:3}"]}],
    },
    {
        id: "banned",
        title: "Banning sequences",
        summary: "Syllable exclusions remove ji, wu and wo. Word exclusions remove nn and nm where syllables meet.",
        root: "Word",
        rules: [
            CJ, V,
            {name: "Syllable", items: ["C.V.('n')"], exclusions: ["'ji'", "'wu'", "'wo'"]},
            {name: "Word", items: ["Syllable{1:3}"], exclusions: ["'nn'", "'nm'"]},
        ],
    },
    {
        id: "final",
        title: "Word-final restrictions",
        summary: "Only the last syllable may end in n or s, because it has its own rule.",
        root: "Word",
        rules: [
            C, V,
            {name: "Syllable", items: ["C.V"]},
            {name: "Final", items: ["C.V.(['n' / 's'])"]},
            {name: "Word", items: ["Syllable{:2}.Final"]},
        ],
    },
    {
        id: "no-repeats",
        title: "Avoiding repeated consonants",
        summary: "One exclusion with a choice rejects words like papa or tito.",
        root: "Word",
        rules: [
            {name: "C", terminal: true, items: ["p", "t", "k", "m"]},
            V,
            {name: "Word", items: ["[C.V]{2:3}"], exclusions: ["'p'.V.'p' / 't'.V.'t' / 'k'.V.'k' / 'm'.V.'m'"]},
        ],
    },
    {
        id: "weighted",
        title: "Frequent and rare sounds",
        summary: "Weights make a and t common and u rare, two-syllable words twice as likely, and a final n appear a quarter of the time.",
        root: "Word",
        weights: true,
        rules: [
            {name: "C", terminal: true, items: [["t", 4], ["k", 3], ["m", 2], ["s", 1]]},
            {name: "V", terminal: true, items: [["a", 4], ["i", 2], ["o", 2], ["u", 1]]},
            {name: "Word", items: [["C.V.('n'*0.25)", 1], ["C.V.C.V.('n'*0.25)", 2]]},
        ],
    },
    {
        id: "awkwords",
        title: "Awkwords-style CV(CV)(n), no ti",
        summary: "C and V become terminal rules. Filtering out the syllable ti becomes an exclusion on a two-letter Syllable rule.",
        root: "Word",
        rules: [
            {name: "C", terminal: true, items: ["p", "t", "k", "s", "m", "n"]},
            {name: "V", terminal: true, items: ["a", "i", "u"]},
            {name: "Syllable", items: ["C.V"], exclusions: ["'ti'"]},
            {name: "Word", items: ["Syllable.(Syllable).('n')"]},
        ],
    },
]
