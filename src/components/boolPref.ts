import {useSyncExternalStore} from "react";

// A viewer preference, deliberately outside Config so it never travels in share links.
// Storage can throw or be absent (private windows, blocked site data), so every access is guarded.
export const createBoolPref = (key: string, fallback: boolean) => {
    const read = (): boolean => {
        try {
            const v = window.localStorage.getItem(key)
            return v === null ? fallback : v === "true"
        } catch {
            return fallback
        }
    }

    let current = read()
    const listeners = new Set<() => void>()

    const set = (value: boolean) => {
        current = value
        try {
            window.localStorage.setItem(key, String(value))
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

    const use = () => useSyncExternalStore(subscribe, () => current)

    // Re-reads storage; used by tests that reset it between cases.
    const resync = () => {
        current = read()
        listeners.forEach(l => l())
    }

    return {set, use, resync}
}
