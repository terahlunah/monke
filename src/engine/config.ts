export type Config = {
    language: string,
    rules: Rule[],
    root: string | null
    enableWeights: boolean,
    enableSerif: boolean,
    // Opt-in because repeating changes the output of grammars whose rewrites feed each other or grow their own match.
    repeatRewrites: boolean,
    // Drives the random draws so the same seed and grammar give the same words. Loaders replace an empty one with a random seed.
    seed: string,
    features: Feature[],
}

// A phonological feature (e.g. harmony) and the values a rule can choose for it. Items refer to values and
// features by id, so renaming one never has to touch them.
export type Feature = {
    id: string
    name: string
    values: FeatureValue[]
}

export type FeatureValue = {
    id: string
    name: string
    weight: number
}

export type Rule = {
    id: string
    name: string
    patterns: RulePattern[]
    rewrites: RewritePattern[]
    exclusions: ExclusionPattern[]
    terminalOnly: boolean
    showRewrites: boolean
    showExclusions: boolean
    collapsed: boolean
    // Feature value ids carried by everything the rule produces. Absent means none.
    values?: string[]
    // Feature ids whose value the rule picks on entry, constraining its subtree. Absent means none.
    chooses?: string[]
}

export type RulePattern = {
    id: string
    pattern: string
    weight: number
    // Feature value ids this terminal entry or pattern row carries. Absent means none: neutral for every feature.
    values?: string[]
}

export type RewritePattern = {
    id: string
    match: string,
    replace: string
}

export type ExclusionPattern = {
    id: string
    match: string,
}
