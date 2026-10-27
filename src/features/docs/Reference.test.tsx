import {describe, expect, it, vi} from "vitest"
import userEvent from "@testing-library/user-event"
import {fireEvent, render, screen, waitFor} from "@testing-library/react"
import {decodeConfig} from "@/engine/sharing.ts"
import {Reference} from "./Reference.tsx"
import {exampleToConfig, firstGrammar} from "./referenceExamples.ts"

// Rule/pattern ids are regenerated on decode, so compare without them.
const stripIds = (c: unknown) => JSON.parse(JSON.stringify(c, (key, value) => key === "id" ? undefined : value))

describe("reference Try it links", () => {
    it("open the example's share URL in a new tab", async () => {
        render(<Reference/>)
        const link = await screen.findByRole("link", {name: `Try it: ${firstGrammar.title} (opens in a new tab)`})

        expect(link).toHaveAttribute("target", "_blank")
        expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
        const url = new URL(link.getAttribute("href")!)
        expect(url.origin).toBe(window.location.origin)
        const decoded = await decodeConfig(url.pathname.slice(1))
        expect(stripIds(decoded)).toEqual(stripIds(exampleToConfig(firstGrammar)))
    })

    it("render a link for every example once encoded", async () => {
        render(<Reference/>)
        await waitFor(() => expect(screen.getAllByRole("link", {name: /^Try it: /}).length).toBeGreaterThan(1))
    })
})

describe("reference prose", () => {
    // JSX drops whitespace at a line break next to an element; lint only catches built-in tags, not <Code>.
    it("never glues inline code to an adjacent word", () => {
        const {container} = render(<Reference/>)
        const glued = [...container.querySelectorAll("p code, li code, td code")].flatMap(code => {
            // Element siblings (e.g. the block "gives …" line in tables) are laid out apart; only text can touch.
            const text = (node: ChildNode | null) => node?.nodeType === Node.TEXT_NODE ? node.textContent ?? "" : ""
            const before = text(code.previousSibling).slice(-1)
            const after = text(code.nextSibling).charAt(0)
            const word = /[\p{L}\p{N}]/u
            return word.test(before) || word.test(after) ? [`${before}[${code.textContent}]${after}`] : []
        })
        expect(glued).toEqual([])
    })
})

describe("reference back to top", () => {
    it("appears only after scrolling and returns focus to the top heading", async () => {
        const user = userEvent.setup()
        const {container} = render(<Reference/>)
        const region = container.querySelector<HTMLElement>("[data-scroll-region]")!
        region.scrollTo = vi.fn() as unknown as typeof region.scrollTo
        expect(screen.queryByRole("button", {name: "Back to top of reference"})).not.toBeInTheDocument()

        region.scrollTop = 500
        fireEvent.scroll(region)
        await user.click(await screen.findByRole("button", {name: "Back to top of reference"}))

        expect(region.scrollTo).toHaveBeenCalledWith(expect.objectContaining({top: 0}))
        expect(screen.getByRole("heading", {name: "Contents"})).toHaveFocus()
    })
})
