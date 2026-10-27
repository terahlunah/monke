import {useState} from "react";

const STORAGE_KEY = "monke.panelSplit"
export const DEFAULT_SPLIT = 60
export const MIN_SPLIT = 30
export const MAX_SPLIT = 75
export const KEY_STEP = 2

export const clampSplit = (value: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, Math.round(value)))

// The split is a viewer preference like the other view settings: per browser, never in the config or share link.
const readSplit = (): number => {
    try {
        const stored = Number(window.localStorage.getItem(STORAGE_KEY))
        return stored ? clampSplit(stored) : DEFAULT_SPLIT
    } catch {
        return DEFAULT_SPLIT
    }
}

const writeSplit = (value: number) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
        // Storage can be unavailable (private mode, blocked); the split then just resets on reload.
    }
}

// Percentage of the row given to the grammar panel.
export const usePanelSplit = () => {
    const [split, setSplitState] = useState(readSplit)
    const setSplit = (value: number) => {
        const next = clampSplit(value)
        setSplitState(next)
        writeSplit(next)
    }
    return [split, setSplit] as const
}
