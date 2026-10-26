import {Grammar} from "@/engine/grammar.ts";
import {draw} from "./draw.ts";

export type DrawRequest = { grammar: Grammar, seed: string, count: number }

self.onmessage = (e: MessageEvent<DrawRequest>) => {
    const {grammar, seed, count} = e.data
    self.postMessage(draw(grammar, seed, count))
}
