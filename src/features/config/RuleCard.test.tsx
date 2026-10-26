import {afterEach, describe, expect, it} from "vitest"
import {render, screen, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "@/app/Home.tsx"

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    render(<Home/>)
    await screen.findByText(/possible branches/)
}

const vowels = () => screen.getAllByLabelText(/^Terminal \d+ of rule Vowel$/).map(i => (i as HTMLInputElement).value)

describe("adding several terminals", () => {
    it("adds one terminal per whitespace-separated word on Enter and clears the field", async () => {
        const user = userEvent.setup()
        await renderApp()
        const before = vowels()
        const field = screen.getByLabelText("Add several terminals to rule Vowel, separated by spaces")

        await user.type(field, "x  y\tz{Enter}")

        expect(vowels()).toEqual([...before, "x", "y", "z"])
        expect(field).toHaveValue("")
        expect(screen.getByText("Added 3 terminals")).toBeInTheDocument()
    })

    it("adds nothing for blank input and keeps the text until Enter", async () => {
        const user = userEvent.setup()
        await renderApp()
        const before = vowels()
        const field = screen.getByLabelText("Add several terminals to rule Vowel, separated by spaces")

        await user.type(field, "   {Enter}")
        expect(vowels()).toEqual(before)

        await user.clear(field)
        await user.type(field, "q")
        expect(vowels()).toEqual(before)
        expect(field).toHaveValue("q")
    })

    it("is offered on terminal rules only", async () => {
        await renderApp()
        expect(screen.queryByLabelText(/^Add several terminals to rule Syllable/)).not.toBeInTheDocument()
    })
})

describe("rule header", () => {
    it("names the kind of rule and marks the start rule", async () => {
        await renderApp()
        const card = (name: string) => screen.getByRole("heading", {name: `Rule ${name}`}).parentElement!

        expect(within(card("Vowel")).getByText("terminal rule")).toBeInTheDocument()
        expect(within(card("Syllable")).getByText("pattern rule")).toBeInTheDocument()
        expect(within(card("Word")).getByText("pattern rule · start rule")).toBeInTheDocument()
    })

    it("shows a collapsed terminal rule's inventory in its header", async () => {
        const user = userEvent.setup()
        await renderApp()
        const values = vowels()

        await user.click(screen.getByRole("button", {name: "Details of rule Vowel"}))

        expect(screen.getByText(values.join(" "))).toBeInTheDocument()
    })

    it("counts rewrites and exclusions in their section labels", async () => {
        const user = userEvent.setup()
        await renderApp()
        const word = screen.getByRole("heading", {name: "Rule Word"}).parentElement!
        const rewrites = within(word).getAllByLabelText(/^Rewrite \d+ of rule Word, match$/).length
        const exclusions = within(word).getAllByLabelText(/^Exclusion \d+ of rule Word$/).length

        expect(within(word).getByRole("heading", {name: `Rewrites ${rewrites}`})).toBeInTheDocument()
        expect(within(word).getByRole("heading", {name: `Exclusions ${exclusions}`})).toBeInTheDocument()

        await user.click(within(word).getByRole("button", {name: "Exclusions of rule Word"}))
        expect(within(word).queryByRole("heading", {name: /^Exclusions/})).not.toBeInTheDocument()
    })
})

describe("rule actions on a small screen", () => {
    const originalMatchMedia = window.matchMedia
    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })
    const small = () => {
        window.matchMedia = (query: string) => ({...originalMatchMedia(query), matches: false})
    }
    const ruleNames = () => screen.getAllByLabelText("Rule name").map(i => (i as HTMLInputElement).value)

    it("folds move, duplicate and delete into one menu per rule", async () => {
        small()
        const user = userEvent.setup()
        await renderApp()
        expect(screen.queryByRole("button", {name: /^Duplicate rule/})).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "More actions for rule Vowel"}))

        expect(await screen.findByRole("menuitem", {name: "Move rule Vowel up"})).toBeInTheDocument()
        expect(screen.getByRole("menuitem", {name: "Move rule Vowel down"})).toBeInTheDocument()
        expect(screen.getByRole("menuitem", {name: "Duplicate rule Vowel"})).toBeInTheDocument()
        expect(screen.getByRole("menuitem", {name: "Delete rule Vowel"})).toBeInTheDocument()
    })

    it("moves, duplicates and deletes from the menu", async () => {
        small()
        const user = userEvent.setup()
        await renderApp()
        const [first, second] = ruleNames()
        const total = ruleNames().length

        await user.click(screen.getByRole("button", {name: `More actions for rule ${second}`}))
        await user.click(await screen.findByRole("menuitem", {name: `Move rule ${second} up`}))
        expect(ruleNames().slice(0, 2)).toEqual([second, first])

        await user.click(screen.getByRole("button", {name: `More actions for rule ${first}`}))
        await user.click(await screen.findByRole("menuitem", {name: `Duplicate rule ${first}`}))
        expect(ruleNames()).toHaveLength(total + 1)

        await user.click(screen.getByRole("button", {name: `More actions for rule ${first} clone`}))
        await user.click(await screen.findByRole("menuitem", {name: `Delete rule ${first} clone`}))
        expect(ruleNames()).toHaveLength(total)
    })

    it("disables moving the first rule up", async () => {
        small()
        const user = userEvent.setup()
        await renderApp()

        await user.click(screen.getByRole("button", {name: `More actions for rule ${ruleNames()[0]}`}))

        expect(await screen.findByRole("menuitem", {name: `Move rule ${ruleNames()[0]} up`})).toHaveAttribute("aria-disabled", "true")
    })
})
