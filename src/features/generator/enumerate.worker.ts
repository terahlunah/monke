import {enumerate} from "@/engine/enumerate.ts";
import {Grammar} from "@/engine/grammar.ts";

export type EnumerateResponse =
    | { ok: true, words: string[], truncated: boolean }
    | { ok: false, error: string }

self.onmessage = (e: MessageEvent<Grammar>) => {
    let response: EnumerateResponse
    try {
        response = {ok: true, ...enumerate(e.data)}
    } catch (err) {
        response = {ok: false, error: err instanceof Error ? err.message : String(err)}
    }
    self.postMessage(response)
}
