import {describe, expect, it} from "vitest"
import {render, screen, waitFor} from "@testing-library/react"
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
