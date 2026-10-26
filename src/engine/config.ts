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
}

export type RulePattern = {
    id: string
    pattern: string
    weight: number
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
