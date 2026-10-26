import {describe, expect, it} from "vitest"
import {randomSeed, seededRng} from "./seed.ts"
import {generate} from "./generate.ts"
import {makeGrammar, makeRule} from "./test-helpers.ts"

const g = makeGrammar("W", [makeRule("W", ["C.V{1:3}"]), makeRule("C", ["p", "t", "k"], {terminalOnly: true}), makeRule("V", ["a", "i", "u"], {terminalOnly: true})])
const draw = (seed: string) => {
    const rng = seededRng(seed)
    return Array.from({length: 20}, () => generate(g, rng))
}

describe("seededRng", () => {
    it("gives the same words for the same seed", () => {
        expect(draw("monke")).toEqual(draw("monke"))
    })

    it("gives different words for different seeds", () => {
        expect(draw("monke")).not.toEqual(draw("monkey"))
    })

    it("stays in [0, 1)", () => {
        const rng = seededRng("")
        for (let i = 0; i < 1000; i++) {
            const x = rng()
            expect(x >= 0 && x < 1).toBe(true)
        }
    })

    it("makes short readable random seeds", () => {
        expect(randomSeed()).toMatch(/^[a-z2-9]{6}$/)
    })
})
