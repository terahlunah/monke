import {Grammar} from "@/engine/grammar.ts";
import {draw, DrawResult} from "./draw.ts";
import type {DrawRequest} from "./draw.worker.ts";

let worker: Worker | null = null

// Drawing thousands of words from a grammar with heavy rewrites or exclusion retries can take long enough to freeze
// the page, so it runs off the main thread. A new request terminates the previous one, which also stops a runaway
// draw. Without Worker support (tests, very old browsers) it runs inline.
export const drawAsync = (grammar: Grammar, seed: string, count: number): Promise<DrawResult> => {
    if (typeof Worker === "undefined") return Promise.resolve(draw(grammar, seed, count))

    worker?.terminate()
    const w = new Worker(new URL("./draw.worker.ts", import.meta.url), {type: "module"})
    worker = w
    return new Promise((resolve, reject) => {
        w.onmessage = (e: MessageEvent<DrawResult>) => {
            w.terminate()
            if (worker === w) worker = null
            resolve(e.data)
        }
        w.onerror = e => {
            w.terminate()
            if (worker === w) worker = null
            reject(new Error(e.message || "Generation failed"))
        }
        const request: DrawRequest = {grammar, seed, count}
        w.postMessage(request)
    })
}
