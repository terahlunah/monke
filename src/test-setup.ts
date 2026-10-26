import "@testing-library/jest-dom/vitest"
import {cleanup} from "@testing-library/react"
import {afterEach} from "vitest"

// Vitest globals are off, so RTL can't register its own auto-cleanup.
afterEach(cleanup)

// jsdom lacks these browser APIs used by headlessui / textarea-autosize.
window.matchMedia ??= ((query: string) => ({
    matches: false,
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
