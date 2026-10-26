import {Config, ExclusionPattern, RewritePattern, Rule, RulePattern} from "./config.ts";

import {ByteBuffer} from "./bytebuffer.ts"

// Version 3 widens counts to uint16 and string lengths to uint32. Earlier
// versions used int8 counts and uint8 lengths, which overflowed past 127/255.
const LATEST_VERSION = 3

export const encodeConfig = async (config: Config): Promise<string> => {

    const buf = new ByteBuffer()

    buf.writeInt8(LATEST_VERSION)
    buf.writeText(config.language ?? "")
    buf.writeText(config.root ?? "")
    buf.writeInt8(config.enableWeights ? 1 : 0)
    buf.writeInt8(config.enableSerif ? 1 : 0)


    // Rules
    buf.writeUint16(config.rules.length)
    for (const rule of config.rules) {
        buf.writeText(rule.name)
        buf.writeInt8(rule.terminalOnly ? 1 : 0)
        buf.writeInt8(rule.showRewrites ? 1 : 0)
        buf.writeInt8(rule.showExclusions ? 1 : 0)
        buf.writeInt8(rule.collapsed ? 1 : 0)

        buf.writeUint16(rule.patterns.length)
        for (const p of rule.patterns) {
            buf.writeText(p.pattern)
            buf.writeFloat32(p.weight)
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
}

const narrow = (hasCollapsed: boolean): Layout => ({
    readString: buf => buf.readString(),
    readCount: buf => buf.readInt8(),
    hasCollapsed,
})

const wide: Layout = {
    readString: buf => buf.readText(),
    readCount: buf => buf.readUint16(),
    hasCollapsed: true,
}

const readConfig = (buf: ByteBuffer, {readString, readCount, hasCollapsed}: Layout): Config => {
    const language = readString(buf)
    const root = readString(buf)
    const enableWeights = buf.readInt8() === 1
    const enableSerif = buf.readInt8() === 1

    const ruleCount = readCount(buf)
    const rules: Rule[] = []

    for (let i = 0; i < ruleCount; i++) {
        const name = readString(buf)
        const terminalOnly = buf.readInt8() === 1
        const showRewrites = buf.readInt8() === 1
        const showExclusions = buf.readInt8() === 1
        const collapsed = hasCollapsed ? buf.readInt8() === 1 : false

        const patternCount = readCount(buf)
        const patterns: RulePattern[] = []
        for (let n = 0; n < patternCount; n++) {
            patterns.push({id: crypto.randomUUID(), pattern: readString(buf), weight: buf.readFloat32()})
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
        })
    }

    return {language, root, rules, enableWeights, enableSerif}
}

// Old links must keep decoding, so a version's decoder is never edited once shipped.
const decoders: Record<number, (buf: ByteBuffer) => Config> = {
    1: buf => readConfig(buf, narrow(false)),
    2: buf => readConfig(buf, narrow(true)),
    3: buf => readConfig(buf, wide),
}

export const decodeConfig = async (data: string): Promise<Config> => {
    const buf = await ByteBuffer.fromBase64(data)

    const version = buf.readInt8()
    const decode = decoders[version]
    if (!decode) throw new Error(`Unsupported share link version ${version}`)
    return decode(buf)
}
