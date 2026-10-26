import {Rng} from "./generate.ts";

// Small, fast PRNG; quality is ample for picking among a handful of alternatives.
export const mulberry32 = (seed: number): Rng => {
    let a = seed
    return () => {
        a = (a + 0x6D2B79F5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// FNV-1a over UTF-16 code units: any text is a valid seed, so people can use words instead of numbers.
const hashSeed = (seed: string): number => {
    let h = 0x811c9dc5
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
}

export const seededRng = (seed: string): Rng => mulberry32(hashSeed(seed))

const SEED_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"

// Short and free of look-alike characters, so it is easy to read out or retype.
export const randomSeed = (): string =>
    Array.from({length: 6}, () => SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)]).join("")

// Output is driven entirely by the seed, so a config without one (old links and files, fresh state) gets one.
export const withSeed = <T extends { seed: string }>(config: T): T =>
    config.seed === "" ? {...config, seed: randomSeed()} : config
