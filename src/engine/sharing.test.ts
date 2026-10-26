import {describe, expect, it} from "vitest"
import {decodeConfig, encodeConfig} from "./sharing.ts"
import {Config} from "./config.ts"
import {ByteBuffer} from "./bytebuffer.ts"
import {tokiPonaRoot, tokiPonaRules} from "./defaults.ts"
import {makeConfig, makeRule} from "./test-helpers.ts"

// Rule/pattern ids are regenerated on decode, so compare without them.
const stripIds = (c: Config) =>
    JSON.parse(JSON.stringify(c, (key, value) => key === "id" ? undefined : value))

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
        ], {language: "tëst ✨", enableWeights: true, enableSerif: true})
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
