import {describe, expect, it} from "vitest"
import {render, screen, waitFor, within} from "@testing-library/react"
import userEvent, {UserEvent} from "@testing-library/user-event"
import {Home} from "@/app/Home.tsx"

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    const view = render(<Home/>)
    await screen.findByText(/possible branches/)
    return view
}

const panel = () => screen.getByRole("region", {name: "Phonological features"})

// Declares harmony: front | back, the way a user would: add the feature, name it, add and name two values.
const declareHarmony = async (user: UserEvent) => {
    await user.click(screen.getByRole("button", {name: "Add feature"}))
    await user.type(screen.getByLabelText("Name of feature 1"), "harmony")
    await user.click(screen.getByRole("button", {name: "Add a value to feature harmony"}))
    await user.type(screen.getByLabelText("Value 1 of feature harmony"), "front")
    await user.click(screen.getByRole("button", {name: "Add a value to feature harmony"}))
    await user.type(screen.getByLabelText("Value 2 of feature harmony"), "back")
}

const tag = async (user: UserEvent, item: string, value: string) => {
    await user.click(screen.getByRole("button", {name: `Feature values of ${item}`}))
    await user.click(await screen.findByRole("checkbox", {name: value}))
    await user.keyboard("{Escape}")
}

const words = () => {
    const heading = screen.getByRole("heading", {name: "Generated words"})
    return heading.nextElementSibling!.textContent!.split(/\s+/).filter(Boolean)
}

describe("phonological features panel", () => {
    it("explains features when there are none", async () => {
        await renderApp()
        expect(panel()).toHaveTextContent(/A rule that chooses a feature keeps one value/)
        expect(screen.queryByRole("button", {name: /^Feature values of/})).not.toBeInTheDocument()
    })

    it("declares, renames and removes features and values", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        expect(within(panel()).getByRole("group", {name: "Feature harmony"})).toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "Delete value back of feature harmony"}))
        expect(screen.queryByLabelText("Value 2 of feature harmony")).not.toBeInTheDocument()
        await user.click(screen.getByRole("button", {name: "Delete feature harmony"}))
        expect(screen.queryByRole("group", {name: "Feature harmony"})).not.toBeInTheDocument()
    })

    it("shows value weights only when weights are on", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        expect(screen.queryByLabelText("Weight of value front of feature harmony")).not.toBeInTheDocument()
        await user.click(screen.getByRole("button", {name: "Weights"}))
        const weight = screen.getByLabelText("Weight of value front of feature harmony")
        await user.clear(weight)
        await user.type(weight, "3")
        await user.tab()
        expect(weight).toHaveValue("3")
    })

    it("marks a duplicate value name on its input", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        const second = screen.getByLabelText("Value 2 of feature harmony")
        await user.clear(second)
        await user.type(second, "front")
        await waitFor(() => expect(second).toHaveAttribute("aria-invalid", "true"))
        expect(within(panel()).getByText(/must be unique across features/)).toBeInTheDocument()
    })

    it("builds vowel harmony through the editor, and the words never mix", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        await tag(user, "terminal 2 of rule Vowel", "front")
        await tag(user, "terminal 3 of rule Vowel", "front")
        await tag(user, "terminal 4 of rule Vowel", "back")
        await tag(user, "terminal 5 of rule Vowel", "back")
        // Tagged but not chosen yet: a warning, the values have no effect.
        expect(await screen.findAllByText(/Feature .harmony. is not chosen when rule .Vowel. is used in .Word./)).not.toHaveLength(0)
        expect(screen.getByRole("group", {name: "Features chosen by rule Vowel"})).toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "Choose a feature in rule Word"}))
        await user.click(await screen.findByRole("menuitem", {name: "harmony"}))
        expect(within(screen.getByRole("group", {name: "Features chosen by rule Word"})).getByText("harmony")).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByText(/Invalid grammar/)).not.toBeInTheDocument())

        const vowelCard = screen.getByRole("heading", {name: "Rule Vowel"}).parentElement!
        expect(vowelCard).toHaveTextContent("[front]")
        expect(vowelCard).toHaveTextContent("[back]")

        // The redraw after an edit is debounced, so wait for words drawn from the new grammar.
        await waitFor(() => {
            expect(words().length).toBeGreaterThan(5)
            expect(words().filter(w => /[ei]/.test(w) && /[ou]/.test(w))).toEqual([])
        }, {timeout: 3000})

        await user.click(screen.getByRole("button", {name: "Stop choosing harmony in rule Word"}))
        expect(await screen.findAllByText(/Feature .harmony. is not chosen when rule .Vowel./)).not.toHaveLength(0)
    })

    it("returns focus to the values button when the popover closes", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        const button = screen.getByRole("button", {name: "Feature values of terminal 1 of rule Vowel"})
        await user.click(button)
        await screen.findByRole("checkbox", {name: "front"})
        await user.keyboard("{Escape}")
        await waitFor(() => expect(button).toHaveFocus())
    })

    it("collapses a row's values button until the row has values, but keeps it in the tab order", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        const name = "Feature values of terminal 1 of rule Vowel"
        const wrapper = () => screen.getByRole("button", {name}).parentElement!
        expect(wrapper()).toHaveAttribute("data-collapsed", "true")
        await tag(user, "terminal 1 of rule Vowel", "front")
        expect(wrapper()).toHaveAttribute("data-collapsed", "false")
    })

    it("warns about a declared feature nothing uses", async () => {
        const user = userEvent.setup()
        await renderApp()
        await declareHarmony(user)
        const list = await screen.findByRole("list", {name: "Grammar warnings"})
        expect(list).toHaveTextContent("Feature 'harmony' is not used by any rule")
    })
})
