import {useSyncExternalStore} from "react";

const KEY = "monke.alwaysShowReorderButtons"

// A viewer preference, deliberately outside Config so it never travels in share links.
// Storage can throw or be absent (private windows, blocked site data), so every access is guarded.
const read = (): boolean => {
    try {
        return window.localStorage.getItem(KEY) === "true"
    } catch {
        return false
    }
}

let current = read()
const listeners = new Set<() => void>()

export const setAlwaysShowReorder = (value: boolean) => {
    current = value
    try {
        window.localStorage.setItem(KEY, String(value))
    } catch {
        // Keep the in-memory value for this session.
    }
    listeners.forEach(l => l())
}

const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export const useAlwaysShowReorder = () => useSyncExternalStore(subscribe, () => current)

// Re-reads storage; used by tests that reset it between cases.
export const resyncAlwaysShowReorder = () => {
    current = read()
    listeners.forEach(l => l())
}
