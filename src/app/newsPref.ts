import {useSyncExternalStore} from "react";
import {newestRelease, releaseStamp, stampNewer} from "@/site/releases.ts";

// Which release notes this browser has seen: the "<date>#<version>" stamp of the newest entry shown, in localStorage.
// A viewer preference, never part of Config. Storage can throw or be absent (private windows, blocked site data); then
// nothing is known about the viewer, and the dot stays hidden rather than nagging on every visit.
const KEY = "monke.newsLastSeen"

const UNAVAILABLE = Symbol("storage unavailable")
type Seen = string | null | typeof UNAVAILABLE

const read = (): Seen => {
    try {
        return window.localStorage.getItem(KEY)
    } catch {
        return UNAVAILABLE
    }
}

let seen = read()
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

// A first-time visitor (no key) gets the dot, as does anyone whose stored stamp is older than the newest entry.
const hasUnread = (s: Seen) => s !== UNAVAILABLE && (s === null || stampNewer(releaseStamp(newestRelease), s))

export const useHasUnreadNews = () => useSyncExternalStore(subscribe, () => hasUnread(seen))

export const markNewsSeen = () => {
    seen = releaseStamp(newestRelease)
    try {
        window.localStorage.setItem(KEY, seen)
    } catch {
        // The in-memory value still clears the dot for this session.
    }
    listeners.forEach(l => l())
}

// Re-reads storage; used by tests that reset it between cases.
export const resyncNews = () => {
    seen = read()
    listeners.forEach(l => l())
}
