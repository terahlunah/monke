import {describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import {Home} from "./Home.tsx"
import {openAwkwordsDialog} from "./test-helpers.ts"

// jsdom has no layout or styles, so contrast can't be computed; it is checked in a real browser instead.
// An open menu is portaled to the end of the body, outside every landmark by design, so `landmarks: false` skips that one rule.
const check = async (container: Element, {landmarks = true} = {}) => {
    const {violations} = await axe.run(container, {rules: {"color-contrast": {enabled: false}, region: {enabled: landmarks}}})
    const summary = violations.map(v => `${v.id}: ${v.help}\n` + v.nodes.map(n => `  ${n.target.join(" ")}`).join("\n"))
    expect(summary, summary.join("\n")).toEqual([])
}

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    const view = render(<Home/>)
    await screen.findByText(/possible branches/)
    return view
}

describe("accessibility (axe)", () => {
    it("generator view with the default grammar", async () => {
        const {container} = await renderApp()
        await check(container)
    })

    it("generator view after new words", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getByRole("button", {name: "New words (new seed)"}))
        await check(container)
    })

    it("reference", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getAllByRole("button", {name: "Reference"})[0])
        await screen.findByText(/builds words from rules you write/)
        await check(container)
    })

    it("faq", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getAllByRole("button", {name: "FAQ"})[0])
        await screen.findByText(/What is this tool/)
        await check(container)
    })

    it("Awkwords import dialog with an error", async () => {
        const user = userEvent.setup()
        await renderApp()
        await openAwkwordsDialog(user)
        await user.type(await screen.findByLabelText("Awkwords pattern or file contents"), "a)")
        await user.click(screen.getByRole("button", {name: "Import"}))
        await screen.findByRole("alert")
        await check(document.body)
    })

    it("generator view with Awkwords import notes", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await openAwkwordsDialog(user)
        await user.type(await screen.findByLabelText("Awkwords pattern or file contents"), "CV^a/C")
        await user.click(screen.getByRole("button", {name: "Import"}))
        await screen.findByRole("region", {name: "Awkwords import notes"})
        await check(container)
    })

    it("generator view with a pattern error", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getAllByRole("button", {name: /^Add (pattern|terminal)/})[0])
        const empty = container.querySelectorAll("input[type=text]")
        await user.type(empty[empty.length - 1], "(((")
        await screen.findByText(/Invalid grammar/)
        await check(container)
    })

    it("generator view with weights on and a terminal rule collapsed", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getByRole("button", {name: "Weights"}))
        await user.click(screen.getByRole("button", {name: "Details of rule Vowel"}))
        await check(container)
    })

    it("generator view with an invalid repeat factor", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getByRole("button", {name: "Weights"}))
        const field = screen.getByLabelText("Repeat factor of terminal 1 of rule Vowel")
        await user.clear(field)
        await user.type(field, "-1")
        await user.tab()
        await expect.poll(() => field.getAttribute("aria-invalid")).toBe("true")
        await check(container)
    })

    it("view settings menu open", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("button", {name: "View settings"}))
        await screen.findByRole("menuitemcheckbox", {name: "Serif font"})
        await check(document.body, {landmarks: false})
    })

    it("examples menu open", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("button", {name: "Examples"}))
        await screen.findByRole("menuitem", {name: "toki pona example"})
        await check(document.body, {landmarks: false})
    })

    it("features panel with values, weights and a warning", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getByRole("button", {name: "Weights"}))
        await user.click(screen.getByRole("button", {name: "Add feature"}))
        await user.type(screen.getByLabelText("Name of feature 1"), "harmony")
        await user.click(screen.getByRole("button", {name: "Add a value to feature harmony"}))
        await user.type(screen.getByLabelText("Value 1 of feature harmony"), "front")
        await user.click(screen.getByRole("button", {name: "Add feature that tags rows of rule Vowel"}))
        await user.click(await screen.findByRole("menuitem", {name: "harmony"}))
        await user.click(screen.getByRole("button", {name: "Feature values of terminal 2 of rule Vowel"}))
        await user.click(await screen.findByRole("checkbox", {name: "front"}))
        await user.keyboard("{Escape}")
        await screen.findAllByText(/Feature .harmony. is neither chosen nor filtered when rule .Vowel./)
        await check(container)
    })

    it("rule features menu, feature values popover and chooses menu open", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("button", {name: "Add feature"}))
        await user.type(screen.getByLabelText("Name of feature 1"), "harmony")
        await user.click(screen.getByRole("button", {name: "Add a value to feature harmony"}))
        await user.type(screen.getByLabelText("Value 1 of feature harmony"), "front")
        await user.click(screen.getByRole("button", {name: "Add feature that tags rows of rule Vowel"}))
        await screen.findByRole("menuitem", {name: "harmony"})
        await check(document.body, {landmarks: false})
        await user.click(screen.getByRole("menuitem", {name: "harmony"}))
        await user.click(screen.getByRole("button", {name: "Feature values of terminal 1 of rule Vowel"}))
        await screen.findByRole("checkbox", {name: "front"})
        await check(document.body, {landmarks: false})
        await user.keyboard("{Escape}")
        await user.click(screen.getByRole("button", {name: "Add feature picked by rule Word"}))
        await screen.findByRole("menuitem", {name: "harmony"})
        await check(document.body, {landmarks: false})
    })

    it("help tips open", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("button", {name: "Weights"}))
        await user.click(screen.getAllByRole("button", {name: "About weight and repeat"})[0])
        await screen.findByRole("link", {name: /Read more in the Reference/})
        await check(document.body, {landmarks: false})
        await user.keyboard("{Escape}")
        await user.click(screen.getByRole("button", {name: "About phonological features"}))
        await screen.findByRole("link", {name: /Read more in the Reference/})
        await check(document.body, {landmarks: false})
    })

    it("what's new panel open", async () => {
        const user = userEvent.setup()
        await renderApp()
        await user.click(screen.getByRole("button", {name: /^What's new/}))
        await screen.findByRole("dialog", {name: "What's new"}, {timeout: 5000})
        await check(document.body, {landmarks: false})
    })
})
