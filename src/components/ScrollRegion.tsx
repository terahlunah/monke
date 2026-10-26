import {ReactNode, useEffect, useRef, useState} from "react";
import {ArrowUpIcon} from "lucide-react";
import {prefersReducedMotion} from "./scroll.ts";

type ScrollRegionProps = {
    // Names the content in the Back to top button, e.g. "reference".
    label: string
    className: string
    children: ReactNode
}

export const ScrollRegion = ({label, className, children}: ScrollRegionProps) => {
    const region = useRef<HTMLDivElement>(null)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const el = region.current!
        const onScroll = () => setScrolled(el.scrollTop > el.clientHeight)
        el.addEventListener("scroll", onScroll, {passive: true})
        return () => el.removeEventListener("scroll", onScroll)
    }, [])

    const backToTop = () => {
        const el = region.current!
        el.scrollTo({top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth"})
        // Focus would otherwise stay on the button, which unmounts once the region is back at the top.
        const heading = el.querySelector<HTMLElement>("h2")
        if (heading) {
            heading.tabIndex = -1
            heading.focus({preventScroll: true})
        }
    }

    return (
        // relative: contains the absolutely positioned sr-only text, which would otherwise extend the document past the shell.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard users must be able to scroll this region
        <div ref={region} data-scroll-region tabIndex={0} className={`relative min-h-0 overflow-auto ${className}`}>
            {children}
            {/* Unmounted rather than hidden when near the top, so it never takes a tab stop. */}
            {scrolled ? (
                <div className="sticky bottom-4 h-0 flex justify-end">
                    <button onClick={backToTop} aria-label={`Back to top of ${label}`}
                            className="absolute bottom-0 right-0 flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 shadow-sm">
                        <ArrowUpIcon className="size-5" aria-hidden="true"/>
                        <span aria-hidden="true" className="hidden md:inline">Top</span>
                    </button>
                </div>
            ) : null}
        </div>
    )
}
