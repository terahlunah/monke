export type Rule = {
    id: string
    name: string
    patterns: RulePattern[]
    rewrites: RewritePattern[]
    exclusions: ExclusionPattern[]
    terminalOnly: boolean
    showRewrites: boolean
    showExclusions: boolean
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