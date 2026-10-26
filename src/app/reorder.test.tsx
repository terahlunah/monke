import {beforeEach, describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "./Home.tsx"
import {resyncAlwaysShowReorder} from "@/components/reorderPref.ts"

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    render(<Home/>)
    await screen.findByText(/possible branches/)
}

const ruleNames = () => screen.getAllByLabelText("Rule name").map(i => (i as HTMLInputElement).value)

describe("reordering without dragging", () => {
    it("moves a rule up and down and keeps focus on the pressed button", async () => {
        const user = userEvent.setup()
        await renderApp()
        const [first, second] = ruleNames()

        await user.click(screen.getByRole("button", {name: `Move rule ${second} up`}))
        expect(ruleNames().slice(0, 2)).toEqual([second, first])
        // The item reached the top, so its up button is disabled and focus moves to the sibling button.
        expect(screen.getByRole("button", {name: `Move rule ${second} down`})).toHaveFocus()

        await user.click(screen.getByRole("button", {name: `Move rule ${second} down`}))
        expect(ruleNames().slice(0, 2)).toEqual([first, second])
        expect(screen.getByRole("button", {name: `Move rule ${second} down`})).toHaveFocus()
    })

    it("disables the move buttons at the ends of the list", async () => {
        await renderApp()
        const names = ruleNames()

        expect(screen.getByRole("button", {name: `Move rule ${names[0]} up`})).toBeDisabled()
        expect(screen.getByRole("button", {name: `Move rule ${names[0]} down`})).toBeEnabled()
        const last = names[names.length - 1]
        expect(screen.getByRole("button", {name: `Move rule ${last} down`})).toBeDisabled()
        expect(screen.getByRole("button", {name: `Move rule ${last} up`})).toBeEnabled()
    })

    it("moves a pattern within its rule", async () => {
        const user = userEvent.setup()
        await renderApp()
        const values = () => screen.getAllByLabelText(/^Terminal \d+ of rule Vowel$/).map(i => (i as HTMLInputElement).value)
        const before = values()

        await user.click(screen.getByRole("button", {name: "Move terminal 1 of rule Vowel down"}))

        expect(values().slice(0, 2)).toEqual([before[1], before[0]])
        expect(screen.getByRole("button", {name: "Move terminal 2 of rule Vowel down"})).toHaveFocus()
    })

    // With two rewrites the moved item ends last, so focus lands on its up button.
    it("moves rewrites", async () => {
        const user = userEvent.setup()
        await renderApp()
        const matches = () => screen.getAllByLabelText(/^Rewrite \d+ of rule Word, match$/).map(i => (i as HTMLInputElement).value)
        const before = matches()

        await user.click(screen.getByRole("button", {name: "Move rewrite 1 of rule Word down"}))

        expect(matches()).toEqual([before[1], before[0]])
        expect(screen.getByRole("button", {name: "Move rewrite 2 of rule Word up"})).toHaveFocus()
    })

    it("moves exclusions", async () => {
        const user = userEvent.setup()
        await renderApp()
        const values = () => screen.getAllByLabelText(/^Exclusion \d+ of rule Word$/).map(i => (i as HTMLInputElement).value)
        const before = values()

        await user.click(screen.getByRole("button", {name: "Move exclusion 2 of rule Word left"}))

        expect(values()).toEqual([before[1], before[0], ...before.slice(2)])
    })
})

describe("reorder button visibility", () => {
    beforeEach(() => {
        window.localStorage.clear()
        resyncAlwaysShowReorder()
    })

    const group = (name: string) => screen.getByRole("button", {name}).parentElement!

    it("keeps collapsed buttons focusable and in the accessibility tree", async () => {
        const user = userEvent.setup()
        await renderApp()
        const button = screen.getByRole("button", {name: "Move terminal 1 of rule Vowel down"})

        expect(group("Move terminal 1 of rule Vowel down").className).toContain("max-w-0")
        expect(group("Move terminal 1 of rule Vowel down").className).toContain("group-has-[:focus-visible]/row:max-w-24")
        button.focus()
        expect(button).toHaveFocus()
        await user.tab()
        expect(button).not.toHaveFocus()
    })

    it("labels list rows and rules up and down and exclusion chips left and right", async () => {
        await renderApp()
        expect(screen.getByRole("button", {name: "Move terminal 2 of rule Vowel up"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Move terminal 1 of rule Vowel down"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Move rewrite 1 of rule Word down"})).toBeInTheDocument()
        expect(screen.queryByRole("button", {name: /Move terminal d of rule Vowel (left|right)/})).toBeNull()
        expect(screen.getByRole("button", {name: "Move exclusion 2 of rule Word left"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Move exclusion 1 of rule Word right"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: `Move rule ${ruleNames()[1]} up`})).toBeInTheDocument()
    })

    it("always shows the buttons and persists the setting when switched on", async () => {
        const user = userEvent.setup()
        await renderApp()

        await user.click(screen.getByRole("switch", {name: "Always show reorder buttons"}))

        expect(screen.getByRole("switch", {name: "Always show reorder buttons"})).toBeChecked()
        expect(group("Move terminal 1 of rule Vowel down").className).not.toContain("max-w-0")
        expect(window.localStorage.getItem("monke.alwaysShowReorderButtons")).toBe("true")
    })

    it("restores the stored setting", async () => {
        window.localStorage.setItem("monke.alwaysShowReorderButtons", "true")
        resyncAlwaysShowReorder()
        await renderApp()
        expect(screen.getByRole("switch", {name: "Always show reorder buttons"})).toBeChecked()
    })
})
