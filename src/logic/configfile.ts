import {Config} from "../pages/Home.tsx";

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

const list = (o: Obj, key: string, where: string): Obj[] => {
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
        return {
            id: str(r, "id", where),
            name: str(r, "name", where),
            patterns: list(r, "patterns", where).map((p, j) => {
                const weight = p.weight
                if (typeof weight !== "number" || !Number.isFinite(weight)) fail(`${where}.patterns[${j}].weight must be a number`)
                return {id: str(p, "id", where), pattern: str(p, "pattern", where), weight: weight as number}
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
            collapsed: bool(r, "collapsed", where),
        }
    })

    return {
        language: str(data, "language", "config"),
        root: root as string | null,
        rules,
        enableWeights: bool(data, "enableWeights", "config"),
        enableSerif: bool(data, "enableSerif", "config"),
    }
}
