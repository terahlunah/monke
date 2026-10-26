import {Config, ExclusionPattern, RewritePattern, Rule, RulePattern} from "./config.ts"
import {defaultConfig, tokiPonaWeightedRules} from "./defaults.ts"
import {randomSeed, withSeed} from "./seed.ts"
import {moveItem, patchById, removeById} from "./list.ts"

export type ConfigAction =
    // Whole config
    | { type: "load", config: Config }
    | { type: "clear" }
    | { type: "loadExample", weighted: boolean }
    | { type: "setLanguage", language: string }
    | { type: "setRoot", root: string | null }
    | { type: "setEnableWeights", enabled: boolean }
    | { type: "setEnableSerif", enabled: boolean }
    | { type: "setRepeatRewrites", enabled: boolean }
    | { type: "setSeed", seed: string }
    // Rules
    | { type: "addRule", terminalOnly: boolean }
    | { type: "removeRule", ruleId: string }
    | { type: "duplicateRule", ruleId: string }
    | { type: "moveRule", from: number, to: number }
    | { type: "renameRule", ruleId: string, name: string }
    | { type: "toggleCollapse", ruleId: string }
    | { type: "setShowRewrites", ruleId: string, show: boolean }
    | { type: "setShowExclusions", ruleId: string, show: boolean }
    // Patterns
    | { type: "addPattern", ruleId: string }
    | { type: "editPattern", ruleId: string, id: string, patch: Partial<Omit<RulePattern, "id">> }
    | { type: "removePattern", ruleId: string, id: string }
    | { type: "movePattern", ruleId: string, from: number, to: number }
    // Rewrites
    | { type: "addRewrite", ruleId: string }
    | { type: "editRewrite", ruleId: string, id: string, patch: Partial<Omit<RewritePattern, "id">> }
    | { type: "removeRewrite", ruleId: string, id: string }
    | { type: "moveRewrite", ruleId: string, from: number, to: number }
    // Exclusions
    | { type: "addExclusion", ruleId: string }
    | { type: "editExclusion", ruleId: string, id: string, patch: Partial<Omit<ExclusionPattern, "id">> }
    | { type: "removeExclusion", ruleId: string, id: string }
    | { type: "moveExclusion", ruleId: string, from: number, to: number }

const newRule = (terminalOnly: boolean): Rule => ({
    id: crypto.randomUUID(),
    name: "",
    patterns: [],
    rewrites: [],
    exclusions: [],
    terminalOnly,
    showRewrites: false,
    showExclusions: false,
    collapsed: false,
})

// Fresh ids keep the copy independent for sorting keys and per-item React state.
const cloneRule = (source: Rule): Rule => ({
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} clone`,
    patterns: source.patterns.map(p => ({...p, id: crypto.randomUUID()})),
    rewrites: source.rewrites.map(p => ({...p, id: crypto.randomUUID()})),
    exclusions: source.exclusions.map(p => ({...p, id: crypto.randomUUID()})),
})

const updateRule = (config: Config, ruleId: string, change: (rule: Rule) => Partial<Rule>): Config => ({
    ...config,
    rules: config.rules.map(r => r.id === ruleId ? {...r, ...change(r)} : r),
})

export const configReducer = (config: Config, action: ConfigAction): Config => {
    switch (action.type) {
        case "load":
            return withSeed(action.config)
        // Flags are preferences, not grammar content, so clearing leaves them alone.
        case "clear":
            return {...config, language: "", root: null, rules: [], seed: randomSeed()}
        case "loadExample":
            return {
                ...config,
                language: defaultConfig.language,
                root: defaultConfig.root,
                rules: action.weighted ? tokiPonaWeightedRules : defaultConfig.rules,
                enableWeights: action.weighted,
                repeatRewrites: defaultConfig.repeatRewrites,
                seed: randomSeed(),
            }
        case "setLanguage":
            return {...config, language: action.language}
        case "setRoot":
            return {...config, root: action.root}
        case "setEnableWeights":
            return {...config, enableWeights: action.enabled}
        case "setEnableSerif":
            return {...config, enableSerif: action.enabled}
        case "setSeed":
            return {...config, seed: action.seed}
        case "setRepeatRewrites":
            return {...config, repeatRewrites: action.enabled}

        case "addRule":
            return {...config, rules: [...config.rules, newRule(action.terminalOnly)]}
        case "removeRule": {
            const removed = config.rules.find(r => r.id === action.ruleId)
            if (!removed) return config
            return {
                ...config,
                root: removed.name === config.root ? null : config.root,
                rules: removeById(config.rules, action.ruleId),
            }
        }
        case "duplicateRule": {
            const at = config.rules.findIndex(r => r.id === action.ruleId)
            if (at === -1) return config
            const rules = config.rules.slice()
            rules.splice(at + 1, 0, cloneRule(config.rules[at]))
            return {...config, rules}
        }
        case "moveRule":
            return {...config, rules: moveItem(config.rules, action.from, action.to)}
        case "renameRule":
            return updateRule(config, action.ruleId, () => ({name: action.name}))
        case "toggleCollapse":
            return updateRule(config, action.ruleId, r => ({collapsed: !r.collapsed}))
        case "setShowRewrites":
            return updateRule(config, action.ruleId, () => ({showRewrites: action.show}))
        case "setShowExclusions":
            return updateRule(config, action.ruleId, () => ({showExclusions: action.show}))

        case "addPattern":
            return updateRule(config, action.ruleId, r => ({
                patterns: [...r.patterns, {id: crypto.randomUUID(), pattern: "", weight: 1.0}],
            }))
        case "editPattern":
            return updateRule(config, action.ruleId, r => ({patterns: patchById(r.patterns, action.id, action.patch)}))
        case "removePattern":
            return updateRule(config, action.ruleId, r => ({patterns: removeById(r.patterns, action.id)}))
        case "movePattern":
            return updateRule(config, action.ruleId, r => ({patterns: moveItem(r.patterns, action.from, action.to)}))

        case "addRewrite":
            return updateRule(config, action.ruleId, r => ({
                rewrites: [...r.rewrites, {id: crypto.randomUUID(), match: "", replace: ""}],
            }))
        case "editRewrite":
            return updateRule(config, action.ruleId, r => ({rewrites: patchById(r.rewrites, action.id, action.patch)}))
        case "removeRewrite":
            return updateRule(config, action.ruleId, r => ({rewrites: removeById(r.rewrites, action.id)}))
        case "moveRewrite":
            return updateRule(config, action.ruleId, r => ({rewrites: moveItem(r.rewrites, action.from, action.to)}))

        case "addExclusion":
            return updateRule(config, action.ruleId, r => ({
                exclusions: [...r.exclusions, {id: crypto.randomUUID(), match: ""}],
            }))
        case "editExclusion":
            return updateRule(config, action.ruleId, r => ({exclusions: patchById(r.exclusions, action.id, action.patch)}))
        case "removeExclusion":
            return updateRule(config, action.ruleId, r => ({exclusions: removeById(r.exclusions, action.id)}))
        case "moveExclusion":
            return updateRule(config, action.ruleId, r => ({exclusions: moveItem(r.exclusions, action.from, action.to)}))
    }
}
