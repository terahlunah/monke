import {useSyncExternalStore} from "react"

export const useMediaQuery = (query: string): boolean =>
    useSyncExternalStore(
        notify => {
            const list = window.matchMedia(query)
            list.addEventListener("change", notify)
            return () => list.removeEventListener("change", notify)
        },
        () => window.matchMedia(query).matches,
    )
