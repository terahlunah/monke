import "@testing-library/jest-dom/vitest"
import {cleanup} from "@testing-library/react"
import {afterEach} from "vitest"

// Vitest globals are off, so RTL can't register its own auto-cleanup.
afterEach(cleanup)

// jsdom lacks these browser APIs used by headlessui / textarea-autosize.
window.matchMedia ??= ((query: string) => ({
    // Tests render the desktop layout; a test can override matchMedia to get the mobile one.
    matches: /min-width/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
})) as typeof window.matchMedia

globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

// axe probes canvas for icon-font detection; jsdom doesn't implement it and logs a noisy "not implemented" error.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
