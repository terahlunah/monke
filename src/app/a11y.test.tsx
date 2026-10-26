import {describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axe from "axe-core"
import {Home} from "./Home.tsx"

// jsdom has no layout or styles, so contrast can't be computed; it is checked in a real browser instead.
const check = async (container: Element) => {
    const {violations} = await axe.run(container, {rules: {"color-contrast": {enabled: false}}})
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
        await user.click(screen.getByRole("button", {name: "Import Awkwords"}))
        await user.type(await screen.findByLabelText("Awkwords pattern or file contents"), "a)")
        await user.click(screen.getByRole("button", {name: "Import"}))
        await screen.findByRole("alert")
        await check(document.body)
    })

    it("generator view with Awkwords import notes", async () => {
        const user = userEvent.setup()
        const {container} = await renderApp()
        await user.click(screen.getByRole("button", {name: "Import Awkwords"}))
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
})
