export type Config = {
    language: string,
    rules: Rule[],
    root: string | null
    enableWeights: boolean,
    enableSerif: boolean,
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
