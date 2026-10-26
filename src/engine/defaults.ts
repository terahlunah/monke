import {Config, Rule} from "./config.ts";


export const tokiPonaRoot = "Word"

export const tokiPonaRules: Rule[] = [
    {
        name: "Vowel",
        id: crypto.randomUUID(),
        terminalOnly: true,
        patterns: [
            {pattern: "a", id: crypto.randomUUID(), weight: 1},
            {pattern: "e", id: crypto.randomUUID(), weight: 1},
            {pattern: "i", id: crypto.randomUUID(), weight: 1},
            {pattern: "o", id: crypto.randomUUID(), weight: 1},
            {pattern: "u", id: crypto.randomUUID(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Consonant",
        id: crypto.randomUUID(),
        terminalOnly: true,
        patterns: [
            {pattern: "p", id: crypto.randomUUID(), weight: 1},
            {pattern: "t", id: crypto.randomUUID(), weight: 1},
            {pattern: "k", id: crypto.randomUUID(), weight: 1},
            {pattern: "s", id: crypto.randomUUID(), weight: 1},
            {pattern: "m", id: crypto.randomUUID(), weight: 1},
            {pattern: "n", id: crypto.randomUUID(), weight: 1},
            {pattern: "l", id: crypto.randomUUID(), weight: 1},
            {pattern: "w", id: crypto.randomUUID(), weight: 1},
            {pattern: "j", id: crypto.randomUUID(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Syllable",
        id: crypto.randomUUID(),
        terminalOnly: false,
        patterns: [
            {pattern: "Consonant.Vowel.('n')", id: crypto.randomUUID(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Word",
        id: crypto.randomUUID(),
        terminalOnly: false,
        patterns: [
            {pattern: "(Consonant).Vowel.('n').Syllable{:2}", id: crypto.randomUUID(), weight: 1},
        ],
        rewrites: [
            {match: "'nn'", replace: "'n'", id: crypto.randomUUID()},
            {match: "'nm'", replace: "'m'", id: crypto.randomUUID()},
        ],
        showRewrites: true,
        exclusions: [
            {match: "'wu'", id: crypto.randomUUID()},
            {match: "'wo'", id: crypto.randomUUID()},
            {match: "'ji'", id: crypto.randomUUID()},
            {match: "'ti'", id: crypto.randomUUID()},
        ],
        showExclusions: true,
        collapsed: false,
    },
]
export const tokiPonaWeightedRules: Rule[] = [
    {
        name: "Vowel",
        id: crypto.randomUUID(),
        terminalOnly: true,
        patterns: [
            {pattern: "a", id: crypto.randomUUID(), weight: 35},
            {pattern: "e", id: crypto.randomUUID(), weight: 25},
            {pattern: "i", id: crypto.randomUUID(), weight: 15},
            {pattern: "o", id: crypto.randomUUID(), weight: 15},
            {pattern: "u", id: crypto.randomUUID(), weight: 10},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Consonant",
        id: crypto.randomUUID(),
        terminalOnly: true,
        patterns: [
            {pattern: "p", id: crypto.randomUUID(), weight: 5},
            {pattern: "t", id: crypto.randomUUID(), weight: 15},
            {pattern: "k", id: crypto.randomUUID(), weight: 15},
            {pattern: "s", id: crypto.randomUUID(), weight: 15},
            {pattern: "m", id: crypto.randomUUID(), weight: 10},
            {pattern: "n", id: crypto.randomUUID(), weight: 10},
            {pattern: "l", id: crypto.randomUUID(), weight: 20},
            {pattern: "w", id: crypto.randomUUID(), weight: 5},
            {pattern: "j", id: crypto.randomUUID(), weight: 5},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Coda",
        id: crypto.randomUUID(),
        terminalOnly: true,
        patterns: [
            {pattern: "n", id: crypto.randomUUID(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Rime",
        id: crypto.randomUUID(),
        terminalOnly: false,
        patterns: [
            {pattern: "Vowel.Coda", id: crypto.randomUUID(), weight: 1},
            {pattern: "Vowel", id: crypto.randomUUID(), weight: 9},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },
    {
        name: "Full",
        id: crypto.randomUUID(),
        terminalOnly: false,
        patterns: [
            {pattern: "Consonant.Rime", id: crypto.randomUUID(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
        collapsed: false,
    },

    {
        name: "Word",
        id: crypto.randomUUID(),
        terminalOnly: false,
        patterns: [
            {pattern: "Rime.Full{:2}", id: crypto.randomUUID(), weight: 5},
            {pattern: "Full{1:3}", id: crypto.randomUUID(), weight: 95},
        ],
        rewrites: [
            {match: "'nn'", replace: "'n'", id: crypto.randomUUID()},
            {match: "'nm'", replace: "'m'", id: crypto.randomUUID()},
        ],
        showRewrites: true,
        exclusions: [
            {match: "'wu'", id: crypto.randomUUID()},
            {match: "'wo'", id: crypto.randomUUID()},
            {match: "'ji'", id: crypto.randomUUID()},
            {match: "'ti'", id: crypto.randomUUID()},
        ],
        showExclusions: true,
        collapsed: false,
    },
]
export const emptyConfig: Config = {
    language: "",
    rules: [],
    root: null,
    enableWeights: false,
    enableSerif: false,
    repeatRewrites: false,
}

export const defaultConfig: Config = {
    language: "toki pona",
    rules: tokiPonaRules,
    root: tokiPonaRoot,
    enableWeights: false,
    enableSerif: false,
    repeatRewrites: false,
}
