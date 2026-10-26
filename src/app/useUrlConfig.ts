import {useEffect, useReducer, useRef, useState} from "react";
import {Config} from "@/engine/config.ts";
import {configReducer} from "@/engine/configReducer.ts";
import {defaultConfig, emptyConfig} from "@/engine/defaults.ts";
import {decodeConfig, encodeConfig} from "@/engine/sharing.ts";

// Owns the config state and mirrors it into the URL path, so every edit burst is a history entry
// and Back/Forward restore configs. `synced` is false until a shared link in the path has been decoded.
export const useUrlConfig = () => {
    // The URL path is only read once at startup; afterwards it just mirrors the config.
    const [urlConfig] = useState(() => window.location.pathname.slice(1))

    const [config, dispatch] = useReducer(configReducer, urlConfig ? emptyConfig : defaultConfig)
    // Holds back URL writes until a link in the path has been decoded, so it isn't overwritten by the empty config.
    const [synced, setSynced] = useState(!urlConfig)

    useEffect(() => {
        if (!urlConfig) return

        decodeConfig(urlConfig)
            .then(config => dispatch({type: "load", config}))
            .catch(e => {
                console.error(e)
                dispatch({type: "load", config: defaultConfig})
            })
            .finally(() => setSynced(true))
    }, [urlConfig])

    // Cancels the debounced URL write of the latest edit; popstate uses it so a stale edit can't push over a restored entry.
    const cancelPendingWrite = useRef<() => void>(() => {})
    // Set when the next config change comes from history, so mirroring it into the URL must not push an entry.
    const restoring = useRef(false)
    // The first write only normalizes the initial URL; it must not create an extra entry to go back to.
    const firstWrite = useRef(true)

    useEffect(() => {
        let latest = 0
        const onPopState = () => {
            cancelPendingWrite.current()
            const path = window.location.pathname.slice(1)
            const id = ++latest
            const restore = (c: Config) => {
                if (id !== latest) return
                restoring.current = true
                dispatch({type: "load", config: c})
            }
            if (!path) return restore(defaultConfig)
            decodeConfig(path).then(restore).catch(console.error)
        }
        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [])

    useEffect(() => {
        if (!synced) return
        if (restoring.current) {
            restoring.current = false
            return
        }

        let cancelled = false
        // Encoding is async and the config changes on every keystroke: debounce so a burst of edits is one undo step, and drop stale results.
        const timer = setTimeout(() => {
            encodeConfig(config)
                .then(data => {
                    if (cancelled) return
                    const path = `/${data}`
                    if (firstWrite.current) {
                        firstWrite.current = false
                        window.history.replaceState(null, "", path)
                    } else if (path !== window.location.pathname) {
                        window.history.pushState(null, "", path)
                    }
                })
                .catch(console.error)
        }, 300)

        const cancel = () => {
            cancelled = true
            clearTimeout(timer)
        }
        cancelPendingWrite.current = cancel
        return cancel
    }, [config, synced])

    return {config, dispatch, synced}
}
