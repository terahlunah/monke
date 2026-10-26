import {afterEach, describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "@/app/Home.tsx"
import {chooseFromMenu} from "@/app/test-helpers.ts"
import {recipes} from "@/features/docs/referenceExamples.ts"

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    render(<Home/>)
    await screen.findByText(/possible branches/)
}

describe("grammar toolbar", () => {
    it("exposes the global flags as pressed buttons", async () => {
        const user = userEvent.setup()
        await renderApp()
        const weights = screen.getByRole("button", {name: "Weights"})
        expect(weights).toHaveAttribute("aria-pressed", "false")
        expect(screen.queryByLabelText(/^Weight of /)).not.toBeInTheDocument()

        await user.click(weights)

        expect(screen.getByRole("button", {name: "Weights"})).toHaveAttribute("aria-pressed", "true")
        expect(screen.getAllByLabelText(/^Weight of /).length).toBeGreaterThan(0)
        expect(screen.getByRole("button", {name: "Repeat rewrites"})).toHaveAttribute("aria-pressed", "false")
    })

    it("starts a new grammar with New", async () => {
        const user = userEvent.setup()
        await renderApp()

        await user.click(screen.getByRole("button", {name: "New grammar"}))

        expect(screen.getByLabelText("Language")).toHaveValue("")
        expect(screen.queryAllByLabelText("Rule name")).toHaveLength(0)
    })

    it("loads the weighted toki pona example from Examples", async () => {
        const user = userEvent.setup()
        await renderApp()
        expect(screen.getByRole("button", {name: "Weights"})).toHaveAttribute("aria-pressed", "false")

        await chooseFromMenu(user, "Examples", "Weighted toki pona example")

        expect(screen.getByRole("button", {name: "Weights"})).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByLabelText("Language")).toHaveValue("toki pona")
    })

    it("loads a Reference recipe from Examples", async () => {
        const user = userEvent.setup()
        await renderApp()
        const recipe = recipes[0]

        await chooseFromMenu(user, "Examples", recipe.title)

        expect(screen.getByLabelText("Language")).toHaveValue(recipe.title)
    })

    it("closes a menu with Escape and returns focus to its button", async () => {
        const user = userEvent.setup()
        await renderApp()
        const examples = screen.getByRole("button", {name: "Examples"})

        await user.click(examples)
        expect(examples).toHaveAttribute("aria-expanded", "true")
        expect(await screen.findByRole("menu")).toBeInTheDocument()
        await user.keyboard("{Escape}")

        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
        expect(examples).toHaveFocus()
    })

    // Opening with Enter highlights the first item, so one ArrowDown reaches the weighted example.
    it("opens a menu from the keyboard and picks an item with Enter", async () => {
        const user = userEvent.setup()
        await renderApp()
        screen.getByRole("button", {name: "Examples"}).focus()

        await user.keyboard("{Enter}")
        await screen.findByRole("menu")
        await user.keyboard("{ArrowDown}{Enter}")

        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Weights"})).toHaveAttribute("aria-pressed", "true")
    })

    it("offers export in its own menu", async () => {
        const user = userEvent.setup()
        await renderApp()

        await user.click(screen.getByRole("button", {name: "Export"}))

        expect(await screen.findByRole("menuitem", {name: "Monke file (.monke)"})).toBeInTheDocument()
    })
})

describe("grammar toolbar on a small screen", () => {
    const originalMatchMedia = window.matchMedia
    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    it("merges import and export into one Files menu", async () => {
        window.matchMedia = (query: string) => ({...originalMatchMedia(query), matches: false})
        const user = userEvent.setup()
        await renderApp()
        expect(screen.queryByRole("button", {name: "Import"})).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "Files"}))

        expect(await screen.findByRole("menuitem", {name: "Import Monke file…"})).toBeInTheDocument()
        expect(screen.getByRole("menuitem", {name: "Import Awkwords…"})).toBeInTheDocument()
        expect(screen.getByRole("menuitem", {name: "Export .monke file"})).toBeInTheDocument()
    })
})
