import {afterEach, describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "./Home.tsx"

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
        await user.click(await screen.findByRole("menuitem", {name: "FAQ"}))

        await screen.findByText(/What is this tool/)
        expect(screen.getByRole("main", {name: "FAQ"})).toHaveFocus()
    })
})
