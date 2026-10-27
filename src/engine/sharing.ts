import {Config, ExclusionPattern, Feature, RewritePattern, Rule, RulePattern} from "./config.ts";

import {ByteBuffer} from "./bytebuffer.ts"

// Version 3 widens counts to uint16 and string lengths to uint32. Earlier
// versions used int8 counts and uint8 lengths, which overflowed past 127/255.
// Version 4 adds the repeatRewrites flag after enableSerif.
// Version 5 adds the seed text after repeatRewrites.
// Version 6 adds the feature declarations after the seed, each rule's values and chooses after its collapsed flag,
// and each pattern's values after its weight. References are written as feature/value indices, not ids.
const LATEST_VERSION = 6

type ValueIndex = Map<string, [feature: number, value: number]>

const writeValues = (buf: ByteBuffer, index: ValueIndex, ids: string[] | undefined) => {
    // An id with no declaration left behind is dropped rather than written as a broken reference.
    const refs = (ids ?? []).flatMap(id => { const ref = index.get(id); return ref ? [ref] : [] })
    buf.writeUint16(refs.length)
    for (const [f, v] of refs) {
        buf.writeUint16(f)
        buf.writeUint16(v)
    }
}

const readValues = (buf: ByteBuffer, features: Feature[]): string[] => {
    const count = buf.readUint16()
    const ids: string[] = []
    for (let i = 0; i < count; i++) {
        const id = features[buf.readUint16()]?.values[buf.readUint16()]?.id
        if (id) ids.push(id)
    }
    return ids
}

export const encodeConfig = async (config: Config): Promise<string> => {

    const buf = new ByteBuffer()

    buf.writeInt8(LATEST_VERSION)
    buf.writeText(config.language ?? "")
    buf.writeText(config.root ?? "")
    buf.writeInt8(config.enableWeights ? 1 : 0)
    buf.writeInt8(config.enableSerif ? 1 : 0)
    buf.writeInt8(config.repeatRewrites ? 1 : 0)
    buf.writeText(config.seed)

    const valueIndex: ValueIndex = new Map()
    const featureIndex = new Map<string, number>()
    buf.writeUint16(config.features.length)
    for (const [f, feature] of config.features.entries()) {
        featureIndex.set(feature.id, f)
        buf.writeText(feature.name)
        buf.writeUint16(feature.values.length)
        for (const [v, value] of feature.values.entries()) {
            valueIndex.set(value.id, [f, v])
            buf.writeText(value.name)
            buf.writeFloat32(value.weight)
        }
    }

    // Rules
    buf.writeUint16(config.rules.length)
    for (const rule of config.rules) {
        buf.writeText(rule.name)
        buf.writeInt8(rule.terminalOnly ? 1 : 0)
        buf.writeInt8(rule.showRewrites ? 1 : 0)
        buf.writeInt8(rule.showExclusions ? 1 : 0)
        buf.writeInt8(rule.collapsed ? 1 : 0)
        writeValues(buf, valueIndex, rule.values)
        const chooses = (rule.chooses ?? []).flatMap(id => featureIndex.get(id) ?? [])
        buf.writeUint16(chooses.length)
        for (const f of chooses) buf.writeUint16(f)

        buf.writeUint16(rule.patterns.length)
        for (const p of rule.patterns) {
            buf.writeText(p.pattern)
            buf.writeFloat32(p.weight)
            writeValues(buf, valueIndex, p.values)
        }

        if (!rule.terminalOnly) {
            buf.writeUint16(rule.rewrites.length)
            for (const r of rule.rewrites) {
                buf.writeText(r.match)
                buf.writeText(r.replace)
            }

            buf.writeUint16(rule.exclusions.length)
            for (const e of rule.exclusions) {
                buf.writeText(e.match)
            }
        }
    }

    return await buf.toBase64()
}

// How a format version lays out its fields. Versions 1 and 2 share the same
// narrow encodings; 2 added the per-rule collapsed flag.
type Layout = {
    readString: (buf: ByteBuffer) => string
    readCount: (buf: ByteBuffer) => number
    hasCollapsed: boolean
    hasRepeatRewrites: boolean
    hasSeed: boolean
    hasFeatures: boolean
}

const narrow = (hasCollapsed: boolean): Layout => ({
    readString: buf => buf.readString(),
    readCount: buf => buf.readInt8(),
    hasCollapsed,
    hasRepeatRewrites: false,
    hasSeed: false,
    hasFeatures: false,
})

const wide = (hasRepeatRewrites: boolean, hasSeed = false, hasFeatures = false): Layout => ({
    readString: buf => buf.readText(),
    readCount: buf => buf.readUint16(),
    hasCollapsed: true,
    hasRepeatRewrites,
    hasSeed,
    hasFeatures,
})

const readConfig = (buf: ByteBuffer, {readString, readCount, hasCollapsed, hasRepeatRewrites, hasSeed, hasFeatures}: Layout): Config => {
    const language = readString(buf)
    const root = readString(buf)
    const enableWeights = buf.readInt8() === 1
    const enableSerif = buf.readInt8() === 1
    const repeatRewrites = hasRepeatRewrites ? buf.readInt8() === 1 : false
    const seed = hasSeed ? readString(buf) : ""

    const features: Feature[] = []
    const featureCount = hasFeatures ? readCount(buf) : 0
    for (let i = 0; i < featureCount; i++) {
        const name = readString(buf)
        const valueCount = readCount(buf)
        const values = []
        for (let n = 0; n < valueCount; n++) {
            values.push({id: crypto.randomUUID(), name: readString(buf), weight: buf.readFloat32()})
        }
        features.push({id: crypto.randomUUID(), name, values})
    }

    const ruleCount = readCount(buf)
    const rules: Rule[] = []

    for (let i = 0; i < ruleCount; i++) {
        const name = readString(buf)
        const terminalOnly = buf.readInt8() === 1
        const showRewrites = buf.readInt8() === 1
        const showExclusions = buf.readInt8() === 1
        const collapsed = hasCollapsed ? buf.readInt8() === 1 : false
        // Empty lists are left out, as in configs built by the app, so absent always means none.
        const extra: Partial<Rule> = {}
        if (hasFeatures) {
            const values = readValues(buf, features)
            if (values.length) extra.values = values
            const chooseCount = readCount(buf)
            const chooses: string[] = []
            for (let n = 0; n < chooseCount; n++) {
                const id = features[readCount(buf)]?.id
                if (id) chooses.push(id)
            }
            if (chooses.length) extra.chooses = chooses
        }

        const patternCount = readCount(buf)
        const patterns: RulePattern[] = []
        for (let n = 0; n < patternCount; n++) {
            const pattern: RulePattern = {id: crypto.randomUUID(), pattern: readString(buf), weight: buf.readFloat32()}
            if (hasFeatures) {
                const values = readValues(buf, features)
                if (values.length) pattern.values = values
            }
            patterns.push(pattern)
        }

        const rewrites: RewritePattern[] = []
        const exclusions: ExclusionPattern[] = []

        if (!terminalOnly) {
            const rewriteCount = readCount(buf)
            for (let n = 0; n < rewriteCount; n++) {
                rewrites.push({id: crypto.randomUUID(), match: readString(buf), replace: readString(buf)})
            }

            const exclusionCount = readCount(buf)
            for (let n = 0; n < exclusionCount; n++) {
                exclusions.push({id: crypto.randomUUID(), match: readString(buf)})
            }
        }

        rules.push({
            id: crypto.randomUUID(),
            name,
            terminalOnly,
            showRewrites,
            showExclusions,
            patterns,
            exclusions,
            rewrites,
            collapsed,
            ...extra,
        })
    }

    return {language, root, rules, enableWeights, enableSerif, repeatRewrites, seed, features}
}

// Old links must keep decoding, so a version's decoder is never edited once shipped.
const decoders: Record<number, (buf: ByteBuffer) => Config> = {
    1: buf => readConfig(buf, narrow(false)),
    2: buf => readConfig(buf, narrow(true)),
    3: buf => readConfig(buf, wide(false)),
    4: buf => readConfig(buf, wide(true)),
    5: buf => readConfig(buf, wide(true, true)),
    6: buf => readConfig(buf, wide(true, true, true)),
}

export const decodeConfig = async (data: string): Promise<Config> => {
    const buf = await ByteBuffer.fromBase64(data)

    const version = buf.readInt8()
    const decode = decoders[version]
    if (!decode) throw new Error(`Unsupported share link version ${version}`)
    return decode(buf)
}
