import {Config} from '../pages/Home.tsx'
import {ExclusionPattern, RewritePattern, Rule, RulePattern} from "../models/ui.ts";
import {uid} from "uid";

import {ByteBuffer} from "./bytebuffer.ts"

// Version 3 widens counts to uint16 and string lengths to uint32. Earlier
// versions used int8 counts and uint8 lengths, which overflowed past 127/255.
const VERSION = 3

export const encodeConfig = async (config: Config): Promise<string> => {

    const buf = new ByteBuffer()

    buf.writeInt8(VERSION)
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

export const decodeConfig = async (data: string): Promise<Config> => {
    const buf = await ByteBuffer.fromBase64(data)

    const version = buf.readInt8()
    const readString = () => version >= 3 ? buf.readText() : buf.readString()
    const readCount = () => version >= 3 ? buf.readUint16() : buf.readInt8()

    const language = readString()
    const root = readString()
    const enableWeights = buf.readInt8() === 1
    const enableSerif = buf.readInt8() === 1


    const ruleCount = readCount()
    const rules: Rule[] = []

    for (let i = 0; i < ruleCount; i++) {

        const name = readString()
        const terminalOnly = buf.readInt8() === 1
        const showRewrites = buf.readInt8() === 1
        const showExclusions = buf.readInt8() === 1
        const collapsed = version >= 2 ? buf.readInt8() === 1 : false

        const patternCount = readCount()
        const patterns: RulePattern[] = []
        for (let n = 0; n < patternCount; n++) {
            patterns.push({id: uid(), pattern: readString(), weight: buf.readFloat32()})
        }

        const rewrites: RewritePattern[] = []
        const exclusions: ExclusionPattern[] = []

        if (!terminalOnly) {
            const rewriteCount = readCount()
            for (let n = 0; n < rewriteCount; n++) {
                rewrites.push({id: uid(), match: readString(), replace: readString()})
            }

            const exclusionCount = readCount()
            for (let n = 0; n < exclusionCount; n++) {
                exclusions.push({id: uid(), match: readString()})
            }
        }

        rules.push({
            id: uid(),
            name: name,
            terminalOnly: terminalOnly,
            showRewrites: showRewrites,
            showExclusions: showExclusions,
            patterns: patterns,
            exclusions: exclusions,
            rewrites: rewrites,
            collapsed: collapsed,
        })


    }

    return {
        language: language,
        root: root,
        rules: rules,
        enableWeights: enableWeights,
        enableSerif: enableSerif,
    }
}
