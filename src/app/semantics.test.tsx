import {afterEach, describe, expect, it} from "vitest"
import {render, screen, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "./Home.tsx"

// dnd-kit renders its own live region, so look inside the generator section for ours.
const generatorStatus = () => within(screen.getByRole("region", {name: "Generator"})).getByRole("status")

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    render(<Home/>)
    await screen.findByText(/possible branches/)
}

describe("grammar errors", () => {
    it("announces the error and flags the offending input", async () => {
        const user = userEvent.setup()
        await renderApp()
        const input = screen.getByLabelText("Pattern 1 of rule Syllable")

        await user.type(input, "(((")

        const alert = await screen.findByRole("alert")
        expect(alert).toHaveTextContent(/Invalid grammar/)
        expect(input).toBeInvalid()
        expect(input).toHaveAccessibleDescription(alert.textContent!)
        // Only the input at fault is flagged.
        expect(screen.getByLabelText("Pattern 1 of rule Word")).toBeValid()
    })

    it("clears the flag once the pattern is fixed", async () => {
        const user = userEvent.setup()
        await renderApp()
        const input = screen.getByLabelText("Pattern 1 of rule Syllable")
        const original = (input as HTMLInputElement).value

        await user.type(input, "(((")
        await screen.findByRole("alert")
        await user.clear(input)
        await user.type(input, original)

        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        expect(input).toBeValid()
    })
})

describe("landmarks and navigation", () => {
    const originalMatchMedia = window.matchMedia
    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    it("exposes one banner, navigation and main landmark and a single h1", async () => {
        await renderApp()

        expect(screen.getAllByRole("banner")).toHaveLength(1)
        expect(screen.getAllByRole("navigation")).toHaveLength(1)
        expect(screen.getAllByRole("main")).toHaveLength(1)
        expect(screen.getAllByRole("heading", {level: 1})).toHaveLength(1)
    })

    it("never skips a heading level", async () => {
        const user = userEvent.setup()
        await renderApp()
        for (const view of ["Generator", "Guide", "FAQ"]) {
            await user.click(screen.getByRole("button", {name: view}))
            let previous = 0
            for (const h of screen.getAllByRole("heading")) {
                const level = Number(h.tagName[1])
                expect(level, `${view}: ${h.textContent}`).toBeLessThanOrEqual(previous + 1)
                previous = level
            }
        }
    })

    it("marks the current view and moves focus to the new view when switching", async () => {
        const user = userEvent.setup()
        await renderApp()
        expect(screen.getByRole("button", {name: "Generator"})).toHaveAttribute("aria-current", "page")

        await user.click(screen.getByRole("button", {name: "Guide"}))

        expect(screen.getByRole("button", {name: "Guide"})).toHaveAttribute("aria-current", "page")
        expect(screen.getByRole("button", {name: "Generator"})).not.toHaveAttribute("aria-current")
        expect(screen.getByRole("main", {name: "Guide"})).toHaveFocus()
    })

    it("offers a skip link to the generator", async () => {
        const user = userEvent.setup()
        await renderApp()

        await user.click(screen.getByRole("button", {name: "Skip to generator"}))

        expect(screen.getByRole("region", {name: "Generator"})).toHaveFocus()
    })

    it("switches views from the mobile menu", async () => {
        window.matchMedia = (query: string) => ({...originalMatchMedia(query), matches: false})
        const user = userEvent.setup()
        await renderApp()

        await user.click(screen.getByRole("button", {name: "Menu"}))
        await user.click(await screen.findByRole("button", {name: "FAQ"}))

        await screen.findByText(/What is this tool/)
        expect(screen.getByRole("main", {name: "FAQ"})).toHaveFocus()
    })

    it("closes the mobile menu with Escape and returns focus to its button", async () => {
        window.matchMedia = (query: string) => ({...originalMatchMedia(query), matches: false})
        const user = userEvent.setup()
        await renderApp()
        const menu = screen.getByRole("button", {name: "Menu"})
        expect(menu).toHaveAttribute("aria-expanded", "false")

        await user.click(menu)
        expect(menu).toHaveAttribute("aria-expanded", "true")
        await user.keyboard("{Escape}")

        expect(menu).toHaveAttribute("aria-expanded", "false")
        expect(menu).toHaveFocus()
    })

    it("closes the mobile menu when focus moves out of it", async () => {
        window.matchMedia = (query: string) => ({...originalMatchMedia(query), matches: false})
        const user = userEvent.setup()
        await renderApp()
        const menu = screen.getByRole("button", {name: "Menu"})

        await user.click(menu)
        await user.tab()
        await user.tab()
        await user.tab()
        await user.tab()
        await user.tab()

        expect(menu).toHaveAttribute("aria-expanded", "false")
    })
})

describe("generator output", () => {
    it("announces a summary instead of the words", async () => {
        const user = userEvent.setup()
        await renderApp()
        const status = generatorStatus()
        expect(status).toHaveTextContent("")

        await user.click(screen.getByRole("button", {name: "Generate"}))

        expect(status).toHaveTextContent("Generated 50 words")
    })

    it("keeps announcing when the same summary repeats", async () => {
        const user = userEvent.setup()
        await renderApp()
        const status = generatorStatus()

        await user.click(screen.getByRole("button", {name: "Generate"}))
        const first = status.firstElementChild
        await user.click(screen.getByRole("button", {name: "Generate"}))

        expect(status).toHaveTextContent("Generated 50 words")
        expect(status.firstElementChild).not.toBe(first)
    })

    it("includes the unique count when duplicates are filtered", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("switch", {name: "Filter Duplicates"}))

        await user.click(screen.getByRole("button", {name: "Generate"}))

        expect(generatorStatus()).toHaveTextContent(/^Generated 50 words, \d+ unique$/)
    })

    it("renders a list when output as list is on", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("switch", {name: "Output as list"}))

        await user.click(screen.getByRole("button", {name: "Generate"}))

        const list = screen.getByRole("list")
        expect(within(list).getAllByRole("listitem")).toHaveLength(50)
    })
})

describe("toggles", () => {
    it("exposes switch state without changing the name", async () => {
        const user = userEvent.setup()
        await renderApp()
        const toggle = screen.getByRole("switch", {name: "Filter Duplicates"})
        expect(toggle).not.toBeChecked()

        await user.click(toggle)

        expect(screen.getByRole("switch", {name: "Filter Duplicates"})).toBeChecked()
    })

    it("exposes the rewrites toggle as a pressed button", async () => {
        const user = userEvent.setup()
        await renderApp()
        const rw = screen.getByRole("button", {name: "Rewrites (Rw) of rule Syllable"})
        expect(rw).toHaveAttribute("aria-pressed", "false")

        await user.click(rw)

        expect(rw).toHaveAttribute("aria-pressed", "true")
    })

    it("exposes a rule's collapsed state", async () => {
        const user = userEvent.setup()
        await renderApp()
        const details = screen.getByRole("button", {name: "Details of rule Vowel"})
        expect(details).toHaveAttribute("aria-expanded", "true")

        await user.click(details)

        expect(details).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByLabelText("Terminal 1 of rule Vowel")).not.toBeInTheDocument()
    })
})
