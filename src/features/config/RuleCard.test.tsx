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

        expect(card("Vowel")).toHaveTextContent("terminal rule")
        expect(card("Syllable")).toHaveTextContent("pattern rule")
        expect(card("Syllable")).not.toHaveTextContent("start rule")
        expect(card("Word")).toHaveTextContent("pattern rule · start rule")
    })

    it("shows a collapsed terminal rule's inventory in its header", async () => {
        const user = userEvent.setup()
        await renderApp()
        const values = vowels()

        await user.click(screen.getByRole("button", {name: "Details of rule Vowel"}))

        expect(screen.getByText(values.join(" "))).toBeInTheDocument()
    })

    it("keeps the exclusions panel header when exclusions are switched off", async () => {
        const user = userEvent.setup()
        await renderApp()
        const word = screen.getByRole("heading", {name: "Rule Word"}).parentElement!
        expect(within(word).getAllByLabelText(/^Exclusion \d+ of rule Word$/).length).toBeGreaterThan(0)

        expect(within(word).getByRole("heading", {name: "Rewrites"})).toBeInTheDocument()
        expect(within(word).getByRole("heading", {name: "Exclusions"})).toBeInTheDocument()

        await user.click(within(word).getByRole("button", {name: "Exclusions of rule Word"}))
        expect(within(word).getByRole("heading", {name: "Exclusions"})).toBeInTheDocument()
        expect(within(word).queryByLabelText(/^Exclusion \d+ of rule Word$/)).not.toBeInTheDocument()
        expect(within(word).queryByRole("button", {name: "Add exclusion to rule Word"})).not.toBeInTheDocument()
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

describe("weight and repeat factor", () => {
    it("are shown per row with weights on, and a negative factor is flagged on its field", async () => {
        const user = userEvent.setup()
        await renderApp()
        expect(screen.queryByLabelText("Repeat factor of terminal 1 of rule Vowel")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "Weights"}))
        expect(screen.getByRole("textbox", {name: "Weight of terminal 1 of rule Vowel"})).toHaveValue("1")
        const field = screen.getByRole("textbox", {name: "Repeat factor of terminal 1 of rule Vowel"})
        expect(field).toHaveValue("1")

        await user.clear(field)
        await user.type(field, "-1")
        await user.tab()
        expect(await screen.findByLabelText("Repeat factor of terminal 1 of rule Vowel")).toHaveAttribute("aria-invalid", "true")

        await user.clear(field)
        await user.type(field, "0.5")
        await user.tab()
        await expect.poll(() => field.getAttribute("aria-invalid")).not.toBe("true")
        expect(field).toHaveValue("0.5")
    })
})
