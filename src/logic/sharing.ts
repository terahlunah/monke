import {Config} from '../pages/Home.tsx'
import {ExclusionPattern, RewritePattern, Rule, RulePattern} from "../models/ui.ts";
import {uid} from "uid";

import {ByteBuffer} from "./bytebuffer.ts"

export const encodeConfig = async (config: Config): Promise<string> => {

    const buf = new ByteBuffer()

    buf.writeInt8(1) // Version
    buf.writeString(config.language ?? "")
    buf.writeString(config.root ?? "")
    buf.writeInt8(config.enableWeights ? 1 : 0)
    buf.writeInt8(config.enableSerif ? 1 : 0)

    // Rules
    buf.writeInt8(config.rules.length)
    for (const rule of config.rules) {
        buf.writeString(rule.name)
        buf.writeInt8(rule.terminalOnly ? 1 : 0)
        buf.writeInt8(rule.showRewrites ? 1 : 0)
        buf.writeInt8(rule.showExclusions ? 1 : 0)

        buf.writeInt8(rule.patterns.length)
        for (const p of rule.patterns) {
            buf.writeString(p.pattern)
            buf.writeFloat32(p.weight)
        }

        if (!rule.terminalOnly) {
            buf.writeInt8(rule.rewrites.length)
            for (const r of rule.rewrites) {
                buf.writeString(r.match)
                buf.writeString(r.replace)
            }

            buf.writeInt8(rule.exclusions.length)
            for (const e of rule.exclusions) {
                buf.writeString(e.match)
            }
        }
    }

    return await buf.toBase64()
}

export const decodeConfig = async (data: string): Promise<Config> => {
    const buf = await ByteBuffer.fromBase64(data)

    buf.readInt8() // version
    const language = buf.readString()
    const root = buf.readString()
    const enableWeights = buf.readInt8() === 1
    const enableSerif = buf.readInt8() === 1


    const ruleCount = buf.readInt8()
    const rules: Rule[] = []

    for (let i = 0; i < ruleCount; i++) {

        const name = buf.readString()
        const terminalOnly = buf.readInt8() === 1
        const showRewrites = buf.readInt8() === 1
        const showExclusions = buf.readInt8() === 1

        const patternCount = buf.readInt8()
        const patterns: RulePattern[] = []
        for (let n = 0; n < patternCount; n++) {
            patterns.push({id: uid(), pattern: buf.readString(), weight: buf.readFloat32()})
        }

        const rewrites: RewritePattern[] = []
        const exclusions: ExclusionPattern[] = []

        if (!terminalOnly) {
            const rewriteCount = buf.readInt8()
            for (let n = 0; n < rewriteCount; n++) {
                rewrites.push({id: uid(), match: buf.readString(), replace: buf.readString()})
            }

            const exclusionCount = buf.readInt8()
            for (let n = 0; n < exclusionCount; n++) {
                exclusions.push({id: uid(), match: buf.readString()})
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