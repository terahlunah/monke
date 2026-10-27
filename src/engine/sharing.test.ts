import {describe, expect, it} from "vitest"
import {decodeConfig, encodeConfig} from "./sharing.ts"
import {Config} from "./config.ts"
import {ByteBuffer} from "./bytebuffer.ts"
import {tokiPonaRoot, tokiPonaRules} from "./defaults.ts"
import {makeConfig, makeRule, repeatRows} from "./test-helpers.ts"

// Rule/pattern ids are regenerated on decode, so compare without them.
const stripIds = (c: Config) =>
    JSON.parse(JSON.stringify(c, (key, value) => key === "id" ? undefined : value))

// Ids are regenerated on decode, so feature references are compared by name.
const named = (c: Config) => {
    const names = new Map<string, string>()
    for (const f of c.features) {
        names.set(f.id, f.name)
        for (const v of f.values) names.set(v.id, `${f.name}:${v.name}`)
    }
    const rename = (ids?: string[]) => ids?.map(id => names.get(id) ?? id)
    return stripIds({
        ...c,
        rules: c.rules.map(r => ({
            ...r,
            chooses: rename(r.chooses),
            classifies: rename(r.classifies),
            patterns: r.patterns.map(p => ({...p, values: rename(p.values)})),
        })),
    })
}

const roundTrip = async (c: Config) => stripIds(await decodeConfig(await encodeConfig(c)))

describe("sharing", () => {
    it("round-trips the default grammar", async () => {
        const config = makeConfig(tokiPonaRoot, tokiPonaRules, {language: "toki pona"})
        expect(await roundTrip(config)).toEqual(stripIds(config))
    })

    it("round-trips unicode, empty rules and every flag", async () => {
        const config = makeConfig("Ünï", [
            makeRule("Ünï", ["'ʃ'.'ŋ' / 日本"], {
                showRewrites: true,
                showExclusions: true,
                collapsed: true,
                rewrites: [{id: "w", match: "'ʃ'", replace: "'😀'"}],
                exclusions: [{id: "e", match: "'ŋŋ'"}],
            }),
            makeRule("Empty", [], {terminalOnly: true}),
            makeRule("Blank", [""], {terminalOnly: true}),
        ], {language: "tëst ✨", enableWeights: true, enableSerif: true, repeatRewrites: true, seed: "🎲 42"})
        config.rules[0].patterns[0].weight = 0.25
        expect(await roundTrip(config)).toEqual(stripIds(config))
    })

    it("round-trips an empty config", async () => {
        const config = makeConfig("", [], {language: ""})
        expect(await roundTrip(config)).toEqual(stripIds(config))
    })

    // Frozen link from format version 2. If this fails, old shared URLs broke:
    // fix the decoder rather than regenerating the fixture.
    it("decodes a frozen version 2 link", async () => {
        const link = "H4sIAAAAAAAACmNiSyvKr0rNYwnPL0phZGAG0wyMjAxMzM56YQwMDfaMEJJVPVtdL4xZ2VCZkUU9O1ud0ZmRgYGBiTEbLFsCUcnIwMDIxJgI5mSCSAAm97oyXwAAAA~~"
        const expected = makeConfig("Word", [
            makeRule("Word", ["C.V", "V"], {
                showRewrites: true,
                showExclusions: true,
                rewrites: [{id: "", match: "'k'.V", replace: "#1#"}],
                exclusions: [{id: "", match: "'kk'"}],
            }),
            makeRule("C", ["k", "t"], {terminalOnly: true}),
            makeRule("V", ["a", "i"], {terminalOnly: true, collapsed: true}),
        ], {language: "frozen", enableWeights: true})
        expect(stripIds(await decodeConfig(link))).toEqual(stripIds(expected))
    })

    // Frozen link from format version 3. Same rule: fix the decoder, not the fixture.
    it("decodes a frozen version 3 link", async () => {
        const link = "H4sIAAAAAAAACj2MOwqAMBAFZxP1IinSBTyBhXfQWlBBAgaClZVHl1Vj8xjezzbAmtO57BUwpjwLlsKIYLBAHwa4OgE-qAEffRg0dq2TZ-Vj9FrqVQyqsQyP_0FA3nAq3qZwAxd3mDWPAAAA"
        const expected = makeConfig("Word", [
            makeRule("Word", ["C.V", "V"], {
                showRewrites: true,
                showExclusions: true,
                rewrites: [{id: "", match: "'k'.V", replace: "#1#"}],
                exclusions: [{id: "", match: "'kk'"}],
            }),
            makeRule("C", ["k", "t"], {terminalOnly: true}),
            makeRule("V", ["a", "i"], {terminalOnly: true, collapsed: true}),
        ], {language: "frozen", enableWeights: true})
        expect(stripIds(await decodeConfig(link))).toEqual(stripIds(expected))
    })

    // Frozen link from format version 4. Same rule: fix the decoder, not the fixture.
    it("decodes a frozen version 4 link", async () => {
        const link = "H4sIAAAAAAAACj2MOwqAMBBE35roRSzSBTyBRe6gtaCCBAwEKyuPLqvGZpi_bYA1p3PZLTCmPAtiKAIRKgwQ_ABXL8BHasBF5weN266VZ-VidFoKChWKsQyP_0FA3nAq3qbkBq3ja2iQAAAA"
        const expected = makeConfig("Word", [
            makeRule("Word", ["C.V", "V"], {
                showRewrites: true,
                showExclusions: true,
                rewrites: [{id: "", match: "'k'.V", replace: "#1#"}],
                exclusions: [{id: "", match: "'kk'"}],
            }),
            makeRule("C", ["k", "t"], {terminalOnly: true}),
            makeRule("V", ["a", "i"], {terminalOnly: true, collapsed: true}),
        ], {language: "frozen", enableWeights: true, repeatRewrites: true})
        expect(stripIds(await decodeConfig(link))).toEqual(stripIds(expected))
    })

    // Frozen link from format version 5. Same rule: fix the decoder, not the fixture.
    it("decodes a frozen version 5 link", async () => {
        const link = "H4sIAAAAAAAACj2MvQmAQBSDv-ffIhbXCeIAFu6gtaCCHHhwWlm5jnO4mDz1bELIlyTNgMm7fVwSoHN-ECQF1uushpiQIkJEDDRFC0ctwGe0bqwpWsV5mcuzMtYaLTUqEao2DLf_QUBe2IdsVnMDAoK1O5kAAAA~"
        const expected = makeConfig("Word", [
            makeRule("Word", ["C.V", "V"], {
                showRewrites: true,
                showExclusions: true,
                rewrites: [{id: "", match: "'k'.V", replace: "#1#"}],
                exclusions: [{id: "", match: "'kk'"}],
            }),
            makeRule("C", ["k", "t"], {terminalOnly: true}),
            makeRule("V", ["a", "i"], {terminalOnly: true, collapsed: true}),
        ], {language: "frozen", enableWeights: true, repeatRewrites: true, seed: "sé3d"})
        expect(stripIds(await decodeConfig(link))).toEqual(stripIds(expected))
    })

    const featured = () => {
        const config = makeConfig("Word", [
            makeRule("Word", ["V{2}"], {chooses: ["h"]}),
            makeRule("V", ["a", "e", "o"], {terminalOnly: true}),
        ], {language: "frozen", enableWeights: true, seed: "s6", features: [
            {id: "h", name: "harmony", values: [{id: "f", name: "front", weight: 1}, {id: "b", name: "back", weight: 2}]},
            {id: "r", name: "rounding", values: [{id: "rv", name: "round", weight: 0.5}]},
        ]})
        config.rules[1].patterns[1].values = ["f"]
        config.rules[1].patterns[2].values = ["b", "rv"]
        config.rules[1].classifies = ["h", "r"]
        return config
    }

    it("round-trips features, item values and chooses", async () => {
        const config = featured()
        expect(named(await decodeConfig(await encodeConfig(config)))).toEqual(named(config))
    })

    it("drops references to features or values that no longer exist", async () => {
        const config = featured()
        config.rules[0].chooses = ["h", "gone"]
        config.rules[1].patterns[0].values = ["gone"]
        const decoded = named(await decodeConfig(await encodeConfig(config)))
        expect(decoded.rules[0].chooses).toEqual(["harmony"])
        expect(decoded.rules[1].patterns[0].values).toBeUndefined()
    })

    // Frozen link from format version 6, encoded once from `featured()` when rule V also carried the value round,
    // which is skipped on decoding. Version 6 has no rule declarations: V is read as classified by the features its
    // rows carry, as `featured()` declares. Same rule: fix the decoder, not the fixture.
    it("decodes a frozen version 6 link", async () => {
        const link = "H4sIAAAAAAAACkWMSwoCQQxEX0cdPY8Lt-MpxnXrjB_EBFpdqAgeXZLGMRBSVXlJ0wD7Ys9Bp8DGSp9AgOtKmAPHXC6mD2FWSb3Bp3V4m3dnYL0Ait21P-khBRYOaIXfV6JStGfda_n2R_-8q8sUwSRmroTLwWUaYXMr48EXEKiV5scAAAA~"
        expect(named(await decodeConfig(link))).toEqual(named(featured()))
    })

    const repeating = () => makeConfig("Word", [
        repeatRows(makeRule("Word", ["[C.V]{2} / C~0.5", "V"]), [0.5]),
        repeatRows(makeRule("C", ["p", "t"], {terminalOnly: true}), [0, 0.25]),
        makeRule("V", ["a"], {terminalOnly: true}),
    ], {language: "frozen", enableWeights: true, seed: "s7"})

    // A declaration with no row values is kept as declared, not recomputed from the rows.
    const declaring = () => {
        const config = makeConfig("Word", [
            repeatRows(makeRule("Word", ["[C.V]{2} / C~0.5", "V"], {chooses: ["h"]}), [0.5]),
            repeatRows(makeRule("C", ["p", "t"], {terminalOnly: true, classifies: ["r"]}), [0, 0.25]),
            makeRule("V", ["a", "e"], {terminalOnly: true, classifies: ["h", "r"]}),
        ], {language: "frozen", enableWeights: true, seed: "s7", features: [
            {id: "h", name: "harmony", values: [{id: "f", name: "front", weight: 1}, {id: "b", name: "back", weight: 2}]},
            {id: "r", name: "rounding", values: [{id: "rv", name: "round", weight: 0.5}]},
        ]})
        config.rules[2].patterns[1].values = ["f"]
        return config
    }

    it("round-trips rule declarations", async () => {
        const config = declaring()
        expect(named(await decodeConfig(await encodeConfig(config)))).toEqual(named(config))
    })

    it("round-trips pattern repeat factors, leaving the default absent", async () => {
        const decoded = await roundTrip(repeating())
        expect(decoded).toEqual(stripIds(repeating()))
        expect("repeat" in decoded.rules[0].patterns[1]).toBe(false)
    })

    // Frozen link from format version 7, encoded once from `declaring()`. Same rule: fix the decoder, not the fixture.
    it("decodes a frozen version 7 link", async () => {
        const link = "H4sIAAAAAAAAClWNzQ7BQBSFvxk_tfQIfYISidippO9QC7EorRIxI6MWCPHoMj8lNjf3nPudc6M-sDP6XqkusNSmFCCBy0wSAfvCnLS6SXqeVA28Uwtviu0RWAwAo6-qPKhaOMwpIO3QtgIIO5AMgVWW5OvH5BmP4uw1Tqa21CY8lXvprBDMRFgF0hnn_3sTIvPQ0D7jGyh-pVZWrfTkBwXE_UoKAQAA"
        expect(named(await decodeConfig(link))).toEqual(named(declaring()))
    })

    it("round-trips more than 127 rules and more than 127 patterns in one rule", async () => {
        const many = makeRule("Many", Array.from({length: 300}, (_, i) => `'p${i}'`), {
            showRewrites: true,
            showExclusions: true,
            rewrites: Array.from({length: 200}, (_, i) => ({id: `w${i}`, match: `'a${i}'`, replace: "'b'"})),
            exclusions: Array.from({length: 200}, (_, i) => ({id: `e${i}`, match: `'x${i}'`})),
        })
        const rules = [many, ...Array.from({length: 300}, (_, i) => makeRule(`R${i}`, ["'a'"]))]
        const config = makeConfig("Many", rules)
        expect(await roundTrip(config)).toEqual(stripIds(config))
    })

    it("round-trips strings longer than 255 bytes", async () => {
        const long = "'" + "ŋ".repeat(500) + "'"
        const config = makeConfig("R", [makeRule("R", [long])], {language: "l".repeat(400)})
        expect(await roundTrip(config)).toEqual(stripIds(config))
    })

    it("rejects a link from an unknown future version with a clear error", async () => {
        const buf = new ByteBuffer()
        buf.writeInt8(99)
        await expect(decodeConfig(await buf.toBase64())).rejects.toThrow("Unsupported share link version 99")
    })

    it("rejects garbage input", async () => {
        await expect(decodeConfig("not-a-link")).rejects.toThrow()
    })
})
