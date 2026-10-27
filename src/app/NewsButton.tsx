import {lazy, Suspense, useRef, useState} from "react";
import {BellIcon} from "lucide-react";
import {markNewsSeen, useHasUnreadNews} from "./newsPref.ts";

// The release notes are read rarely, so the panel loads on first open.
const WhatsNew = lazy(() => import("./WhatsNew.tsx"))

export const NewsButton = ({className = ""}: { className?: string }) => {
    const unread = useHasUnreadNews()
    const [open, setOpen] = useState(false)
    // Stays mounted after the first open so the sheet doesn't reload.
    const [loaded, setLoaded] = useState(false)
    const button = useRef<HTMLButtonElement>(null)

    const close = () => {
        setOpen(false)
        // Headless UI releases its focus trap and inert page after this render, so focusing now would be undone.
        requestAnimationFrame(() => button.current?.focus())
    }

    return (
        <>
            {/* The name carries the state; the dot is only a visual cue. */}
            <button ref={button} aria-label={unread ? "What's new (new updates)" : "What's new"} aria-haspopup="dialog"
                    className={`relative flex items-center justify-center rounded-md hover:bg-white/5 ${className}`}
                    onClick={() => {
                        markNewsSeen()
                        setOpen(true)
                        setLoaded(true)
                    }}>
                <BellIcon className="size-5" aria-hidden="true"/>
                {unread ? <span aria-hidden="true" data-testid="news-dot"
                                className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-notify ring-2 ring-surface"/> : null}
            </button>
            {loaded ? <Suspense fallback={null}><WhatsNew open={open} onClose={close}/></Suspense> : null}
        </>
    )
}
