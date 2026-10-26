import {afterEach, describe, expect, it, vi} from "vitest"
import {drawAsync} from "./drawAsync.ts"
import {makeGrammar, makeRule} from "@/engine/test-helpers.ts"

class FakeWorker {
    static instances: FakeWorker[] = []
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: ((e: ErrorEvent) => void) | null = null
    terminated = false
    constructor() {
        FakeWorker.instances.push(this)
    }
    postMessage() {}
    terminate() {
        this.terminated = true
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
    FakeWorker.instances = []
})

describe("drawAsync", () => {
    const g = makeGrammar("R", [makeRule("R", ["'a'"])])

    it("draws inline without Worker support", async () => {
        expect((await drawAsync(g, "s", 3)).words).toEqual(["a", "a", "a"])
    })

    it("terminates the superseded worker so its result can never arrive", () => {
        vi.stubGlobal("Worker", FakeWorker)
        void drawAsync(g, "s", 3)
        void drawAsync(g, "t", 3)
        const [first, second] = FakeWorker.instances
        expect(first.terminated).toBe(true)
        expect(second.terminated).toBe(false)
    })

    it("resolves with the worker's answer", async () => {
        vi.stubGlobal("Worker", FakeWorker)
        const result = drawAsync(g, "s", 1)
        FakeWorker.instances[0].onmessage!({data: {words: ["x"], error: null}} as MessageEvent)
        expect(await result).toEqual({words: ["x"], error: null})
    })
})
