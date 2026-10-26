import {enumerate, Enumeration} from "@/engine/enumerate.ts";
import {Grammar} from "@/engine/grammar.ts";
import type {EnumerateResponse} from "./enumerate.worker.ts";

let worker: Worker | null = null

// Listing a large grammar takes a few hundred milliseconds, so it runs off the main thread to keep typing and
// screen readers responsive. A new request terminates the previous one instead of queueing behind it.
// Without Worker support (tests, very old browsers) it runs inline.
export const listAll = (grammar: Grammar): Promise<Enumeration> => {
    if (typeof Worker === "undefined") {
        try {
            return Promise.resolve(enumerate(grammar))
        } catch (e) {
            return Promise.reject(e)
        }
    }

    worker?.terminate()
    const w = new Worker(new URL("./enumerate.worker.ts", import.meta.url), {type: "module"})
    worker = w
    return new Promise((resolve, reject) => {
        w.onmessage = (e: MessageEvent<EnumerateResponse>) => {
            w.terminate()
            if (worker === w) worker = null
            if (e.data.ok) resolve({words: e.data.words, truncated: e.data.truncated})
            else reject(new Error(e.data.error))
        }
        w.onerror = e => {
            w.terminate()
            if (worker === w) worker = null
            reject(new Error(e.message || "Listing failed"))
        }
        w.postMessage(grammar)
    })
}
