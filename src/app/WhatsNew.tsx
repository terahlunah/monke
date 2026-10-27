import {useEffect, useState} from "react";
import {Dialog, DialogPanel, DialogTitle} from "@headlessui/react";
import {XIcon} from "lucide-react";
import {ReleaseArticle} from "@/site/ReleaseNotes.tsx";
import {releases} from "@/site/releases.ts";

type Props = {
    open: boolean
    onClose: () => void
}

const linkClass = "text-primary-text underline"

// A side sheet over the app. Headless UI's Dialog traps focus and closes on Escape; the owner of `open` returns focus
// to the bell. The list is the same data and markup as the /news/ page.
export default function WhatsNew({open, onClose}: Props) {
    // The component loads lazily, so it can first render with open already true; Headless UI only hides the rest of the
    // page (inert) when the dialog goes from closed to open, so the first open waits for a render with it closed.
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true))
        return () => cancelAnimationFrame(id)
    }, [])

    return (
        <Dialog open={open && mounted} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/60" aria-hidden="true"/>
            <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8">
                <DialogPanel className="flex flex-col w-full max-w-6xl max-h-full rounded-lg bg-surface border border-line-strong shadow-lg overflow-hidden">
                    <div className="flex flex-row items-center justify-between gap-3 pl-5 pr-3 h-14 shrink-0 border-b border-line">
                        <DialogTitle className="font-bold text-xl">What's new</DialogTitle>
                        <button aria-label="Close" onClick={onClose}
                                className="flex size-11 md:size-9 items-center justify-center rounded-md hover:bg-white/5">
                            <XIcon className="size-5" aria-hidden="true"/>
                        </button>
                    </div>
                    <div className="grow min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-8 leading-relaxed">
                        {releases.map(r => <ReleaseArticle key={r.version} release={r} level={3} newTab/>)}
                    </div>
                    <p className="flex flex-row flex-wrap gap-x-6 gap-y-1 px-5 py-3 shrink-0 border-t border-line">
                        <a className={linkClass} href="/news/" target="_blank" rel="noreferrer noopener">
                            All release notes<span className="sr-only"> (opens in a new tab)</span></a>
                        <a className={linkClass} href="/news/feed.xml" target="_blank" rel="noreferrer noopener">
                            Atom feed<span className="sr-only"> (opens in a new tab)</span></a>
                    </p>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
