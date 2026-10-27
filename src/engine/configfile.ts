import {carriedFeatures, Config} from "./config.ts";

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)

const fail = (what: string): never => {
    throw new Error(`Invalid config file: ${what}`)
}

const str = (o: Obj, key: string, where: string): string => {
    const v = o[key]
    return typeof v === "string" ? v : fail(`${where}.${key} must be text`)
}

const bool = (o: Obj, key: string, where: string): boolean => {
    const v = o[key]
    return typeof v === "boolean" ? v : fail(`${where}.${key} must be true or false`)
}

// Files exported by older versions lack fields added later; a missing key takes the default, a wrong-typed one still fails.
const optional = <T>(o: Obj, key: string, fallback: T, read: (o: Obj, key: string, where: string) => T, where: string): T =>
    o[key] === undefined ? fallback : read(o, key, where)

// A list of ids; kept absent when the file has none so configs compare equal to app-built ones.
const ids = (o: Obj, key: string, where: string): string[] | undefined => {
    const v = o[key]
    if (v === undefined) return undefined
    if (!Array.isArray(v) || v.some(x => typeof x !== "string")) return fail(`${where}.${key} must be a list of text`)
    return v.length ? v as string[] : undefined
}

const withIds = <T extends object>(item: T, o: Obj, keys: string[], where: string): T => {
    const out = {...item} as Record<string, unknown>
    for (const key of keys) {
        const v = ids(o, key, where)
        if (v) out[key] = v
    }
    return out as T
}

const number = (o: Obj, key: string, where: string): number => {
    const v = o[key]
    return typeof v === "number" && Number.isFinite(v) ? v : fail(`${where}.${key} must be a number`)
}

const list =(o: Obj, key: string, where: string): Obj[] => {
    const v = o[key]
    if (!Array.isArray(v)) return fail(`${where}.${key} must be a list`)
    return v.map((item, i) => isObj(item) ? item : fail(`${where}.${key}[${i}] must be an object`))
}

// Rebuilds the config field by field so unknown keys in a hand-edited file never reach app state.
export const parseConfigFile = (text: string): Config => {
    let data: unknown
    try {
        data = JSON.parse(text)
    } catch {
        return fail("not valid JSON")
    }
    if (!isObj(data)) return fail("expected an object")

    const root = data.root
    if (root !== null && typeof root !== "string") fail("root must be text or null")

    const rules = list(data, "rules", "config").map((r, i) => {
        const where = `rules[${i}]`
        return withIds({
            id: str(r, "id", where),
            name: str(r, "name", where),
            patterns: list(r, "patterns", where).map((p, j) => {
                const weight = p.weight
                if (typeof weight !== "number" || !Number.isFinite(weight)) fail(`${where}.patterns[${j}].weight must be a number`)
                return withIds({
                    id: str(p, "id", where), pattern: str(p, "pattern", where), weight: weight as number,
                    ...p.repeat === undefined ? {} : {repeat: number(p, "repeat", `${where}.patterns[${j}]`)},
                }, p, ["values"], where)
            }),
            rewrites: list(r, "rewrites", where).map(p => ({
                id: str(p, "id", where), match: str(p, "match", where), replace: str(p, "replace", where),
            })),
            exclusions: list(r, "exclusions", where).map(p => ({
                id: str(p, "id", where), match: str(p, "match", where),
            })),
            terminalOnly: bool(r, "terminalOnly", where),
            showRewrites: bool(r, "showRewrites", where),
            showExclusions: bool(r, "showExclusions", where),
            collapsed: optional(r, "collapsed", false, bool, where),
        }, r, ["chooses", "classifies"], where)
    })

    const config: Config = {
        language: optional(data, "language", "", str, "config"),
        root: root as string | null,
        rules,
        enableWeights: optional(data, "enableWeights", false, bool, "config"),
        enableSerif: optional(data, "enableSerif", false, bool, "config"),
        repeatRewrites: optional(data, "repeatRewrites", false, bool, "config"),
        seed: optional(data, "seed", "", str, "config"),
        features: data.features === undefined ? [] : list(data, "features", "config").map((f, i) => ({
            id: str(f, "id", `features[${i}]`),
            name: str(f, "name", `features[${i}]`),
            values: list(f, "values", `features[${i}]`).map(v => ({
                id: str(v, "id", `features[${i}]`), name: str(v, "name", `features[${i}]`), weight: number(v, "weight", `features[${i}]`),
            })),
        })),
    }
    // Files from before rules declared their features: such a rule is classified by the features its rows carry.
    // Rows only carry values of declared features, so this also holds for app-built rules that declare none.
    return {
        ...config,
        rules: config.rules.map(r => {
            const classifies = r.classifies ?? carriedFeatures(r, config.features)
            return classifies ? {...r, classifies} : r
        }),
    }
}
