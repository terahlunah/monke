import {afterEach, describe, expect, it} from "vitest"
import {render, screen, waitFor, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "./Home.tsx"
import {toggleViewSetting} from "./test-helpers.ts"

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
        // The input is described by the copy of the message shown right below it.
        expect(input).toHaveAccessibleDescription(alert.textContent!.replace("Invalid grammar: ", ""))
        expect(screen.getByText(alert.textContent!.replace("Invalid grammar: ", ""), {selector: "p:not([role])"})).toBeVisible()
        // Only the input at fault is flagged.
        expect(screen.getByLabelText("Pattern 1 of rule Word")).toBeValid()
    })

    it("suggests the closest rule name under the pattern with a typo", async () => {
        const user = userEvent.setup()
        await renderApp()
        const input = screen.getByLabelText("Pattern 1 of rule Syllable")
        await user.clear(input)
        await user.type(input, "Consonant.Vowl")

        expect(await screen.findByRole("alert")).toHaveTextContent("Did you mean `Vowel`?")
        expect(input).toBeInvalid()
        expect(input).toHaveAccessibleDescription("Unknown rule 'Vowl' (rule : 'Syllable'). Did you mean `Vowel`?")
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
        for (const view of ["Generator", "Reference", "FAQ"]) {
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

        await user.click(screen.getByRole("button", {name: "Reference"}))

        expect(screen.getByRole("button", {name: "Reference"})).toHaveAttribute("aria-current", "page")
        expect(screen.getByRole("button", {name: "Generator"})).not.toHaveAttribute("aria-current")
        expect(screen.getByRole("main", {name: "Reference"})).toHaveFocus()
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

        await user.click(screen.getByRole("button", {name: "New words (new seed)"}))

        await waitFor(() => expect(status).toHaveTextContent("Generated 50 words"))
    })

    it("does not announce automatic updates", async () => {
        const user = userEvent.setup()
        await renderApp()
        const status = generatorStatus()

        await user.type(screen.getByLabelText("Word count"), "0")

        await waitFor(() => expect(screen.getByText(/^[a-z]+( [a-z]+)*$/, {selector: "p"}).textContent!.split(" ")).toHaveLength(500))
        expect(status).toHaveTextContent("")
    })

    it("keeps announcing when the same summary repeats", async () => {
        const user = userEvent.setup()
        await renderApp()
        const status = generatorStatus()

        await user.click(screen.getByRole("button", {name: "New words (new seed)"}))
        await waitFor(() => expect(status).toHaveTextContent("Generated 50 words"))
        const first = status.firstElementChild
        await user.click(screen.getByRole("button", {name: "New words (new seed)"}))

        await waitFor(() => expect(status.firstElementChild).not.toBe(first))
        expect(status).toHaveTextContent("Generated 50 words")
    })

    it("includes the unique count when duplicates are filtered", async () => {
        const user = userEvent.setup()
        await renderApp()
        await toggleViewSetting(user, "Filter duplicates")

        await user.click(screen.getByRole("button", {name: "New words (new seed)"}))

        await waitFor(() => expect(generatorStatus()).toHaveTextContent(/^Generated 50 words, \d+ unique$/))
    })

    it("renders a list when output as list is on", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("radio", {name: "List"}))

        await user.click(screen.getByRole("button", {name: "New words (new seed)"}))

        const output = within(screen.getByRole("region", {name: "Generator"}))
        await waitFor(() => expect(within(output.getByRole("list")).getAllByRole("listitem")).toHaveLength(50))
    })
})

describe("toggles", () => {
    it("exposes a view setting's state without changing its name", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("button", {name: "View settings"}))
        const item = await screen.findByRole("menuitemcheckbox", {name: "Filter duplicates"})
        expect(item).toHaveAttribute("aria-checked", "false")

        await user.click(item)

        // The menu stays open, so the same item reports its new state.
        expect(screen.getByRole("menuitemcheckbox", {name: "Filter duplicates"})).toHaveAttribute("aria-checked", "true")
    })

    it("exposes the output style as a radio group", async () => {
        const user = userEvent.setup()
        await renderApp()
        const group = screen.getByRole("radiogroup", {name: "Output style"})
        expect(within(group).getByRole("radio", {name: "Paragraph"})).toBeChecked()

        await user.click(within(group).getByRole("radio", {name: "List"}))

        expect(within(group).getByRole("radio", {name: "List"})).toBeChecked()
        expect(within(group).getByRole("radio", {name: "Paragraph"})).not.toBeChecked()
    })

    it("switches the serif font from the view settings", async () => {
        const user = userEvent.setup()
        await renderApp()
        const rule = () => screen.getByLabelText("Terminal 1 of rule Vowel")
        expect(rule()).toHaveClass("font-mono")

        await toggleViewSetting(user, "Serif font")

        expect(rule()).toHaveClass("font-serif")
        expect(rule()).not.toHaveClass("font-mono")
    })

    it("exposes the rewrites toggle as a pressed button", async () => {
        const user = userEvent.setup()
        await renderApp()
        const rw = screen.getByRole("button", {name: "Rewrites of rule Syllable"})
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
