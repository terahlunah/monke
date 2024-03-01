import {uid} from "uid";
import {Rule} from "../models/ui.ts";


export const tokiPonaRoot = "Word"

export const tokiPonaRules: Rule[] = [
    {
        name: "Vowel",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "a", id: uid(), weight: 1},
            {pattern: "e", id: uid(), weight: 1},
            {pattern: "i", id: uid(), weight: 1},
            {pattern: "o", id: uid(), weight: 1},
            {pattern: "u", id: uid(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Consonant",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "p", id: uid(), weight: 1},
            {pattern: "t", id: uid(), weight: 1},
            {pattern: "k", id: uid(), weight: 1},
            {pattern: "s", id: uid(), weight: 1},
            {pattern: "m", id: uid(), weight: 1},
            {pattern: "n", id: uid(), weight: 1},
            {pattern: "l", id: uid(), weight: 1},
            {pattern: "w", id: uid(), weight: 1},
            {pattern: "j", id: uid(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Syllable",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "Consonant.Vowel.('n')", id: uid(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Word",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "(Consonant).Vowel.('n').Syllable{:2}", id: uid(), weight: 1},
        ],
        rewrites: [
            {match: "'nn'", replace: "'n'", id: uid()},
            {match: "'nm'", replace: "'m'", id: uid()},
        ],
        showRewrites: true,
        exclusions: [
            {match: "'wu'", id: uid()},
            {match: "'wo'", id: uid()},
            {match: "'ji'", id: uid()},
            {match: "'ti'", id: uid()},
        ],
        showExclusions: true,
    },
]
export const tokiPonaWeightedRules: Rule[] = [
    {
        name: "Vowel",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "a", id: uid(), weight: 35},
            {pattern: "e", id: uid(), weight: 25},
            {pattern: "i", id: uid(), weight: 15},
            {pattern: "o", id: uid(), weight: 15},
            {pattern: "u", id: uid(), weight: 10},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Consonant",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "p", id: uid(), weight: 5},
            {pattern: "t", id: uid(), weight: 15},
            {pattern: "k", id: uid(), weight: 15},
            {pattern: "s", id: uid(), weight: 15},
            {pattern: "m", id: uid(), weight: 10},
            {pattern: "n", id: uid(), weight: 10},
            {pattern: "l", id: uid(), weight: 20},
            {pattern: "w", id: uid(), weight: 5},
            {pattern: "j", id: uid(), weight: 5},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Coda",
        id: uid(),
        terminalOnly: true,
        patterns: [
            {pattern: "n", id: uid(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Rime",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "Vowel.Coda", id: uid(), weight: 1},
            {pattern: "Vowel", id: uid(), weight: 9},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },
    {
        name: "Full",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "Consonant.Rime", id: uid(), weight: 1},
        ],
        rewrites: [],
        showRewrites: false,
        exclusions: [],
        showExclusions: false,
    },

    {
        name: "Word",
        id: uid(),
        terminalOnly: false,
        patterns: [
            {pattern: "Rime.Full{:2}", id: uid(), weight: 5},
            {pattern: "Full{1:3}", id: uid(), weight: 95},
        ],
        rewrites: [
            {match: "'nn'", replace: "'n'", id: uid()},
            {match: "'nm'", replace: "'m'", id: uid()},
        ],
        showRewrites: true,
        exclusions: [
            {match: "'wu'", id: uid()},
            {match: "'wo'", id: uid()},
            {match: "'ji'", id: uid()},
            {match: "'ti'", id: uid()},
        ],
        showExclusions: true,
    },
]