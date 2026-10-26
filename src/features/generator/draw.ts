import {generate, Rng} from "@/engine/generate.ts";
import {Grammar} from "@/engine/grammar.ts";
import {seededRng} from "@/engine/seed.ts";

export type DrawResult = { words: string[], error: string | null }

// A failure keeps the words drawn before it, so the output shows how far the grammar got.
export const draw = (grammar: Grammar, seed: string, count: number): DrawResult => {
    const rng: Rng = seededRng(seed)
    const words: string[] = []
    try {
        for (let i = 0; i < count; i++) words.push(generate(grammar, rng))
    } catch (e) {
        return {words, error: (e as Error).message}
    }
    return {words, error: null}
}
