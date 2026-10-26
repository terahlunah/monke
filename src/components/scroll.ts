export const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

// Scrolls only the region, never the window: scrollIntoView also scrolls ancestors, which would shift the
// fixed-height app shell and expose the page background below it.
export const scrollRegionTo = (region: HTMLElement, target: HTMLElement) => {
    const top = target.getBoundingClientRect().top - region.getBoundingClientRect().top + region.scrollTop
    region.scrollTo({top, behavior: prefersReducedMotion() ? "auto" : "smooth"})
}

