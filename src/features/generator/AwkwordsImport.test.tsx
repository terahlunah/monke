import {describe, expect, it} from "vitest"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "@/app/Home.tsx"
import {openAwkwordsDialog} from "@/app/test-helpers.ts"

const renderApp = async () => {
    window.history.replaceState(null, "", "/")
    render(<Home/>)
    await screen.findByText(/possible branches/)
}

describe("Awkwords import", () => {
    it("imports a pasted file, prefills the word count and lists notes until dismissed", async () => {
        const user = userEvent.setup()
        await renderApp()
        await openAwkwordsDialog(user)
        expect(screen.getByLabelText("Awkwords pattern or file contents")).toHaveFocus()

        await user.type(screen.getByLabelText("Awkwords pattern or file contents"), "C:p/t{enter}V:a/i{enter}r:CV^a/C{enter}n:120")
        await user.click(screen.getByRole("button", {name: "Import"}))

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(screen.getByDisplayValue("Filtered1")).toBeInTheDocument()
        expect(screen.getByLabelText("Word count")).toHaveValue("120")
        const notes = screen.getByRole("region", {name: "Awkwords import notes"})
        expect(notes).toHaveTextContent("probabilities may differ slightly")
        expect(screen.getByRole("button", {name: "Import"})).toHaveFocus()

        await user.click(screen.getByRole("button", {name: "Dismiss import notes"}))
        expect(screen.queryByRole("region", {name: "Awkwords import notes"})).not.toBeInTheDocument()
    })

    it("shows a parse error with its position and keeps the dialog open", async () => {
        const user = userEvent.setup()
        await renderApp()
        await openAwkwordsDialog(user)
        const input = screen.getByLabelText("Awkwords pattern or file contents")
        await user.type(input, "C[[V")
        await user.click(screen.getByRole("button", {name: "Import"}))

        expect(await screen.findByRole("alert")).toHaveTextContent("never closed (line 1, column 2)")
        expect(input).toHaveAttribute("aria-invalid", "true")
        expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("closes on Escape and returns focus to its button", async () => {
        const user = userEvent.setup()
        await renderApp()
        await openAwkwordsDialog(user)
        await user.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(screen.getByRole("button", {name: "Import"})).toHaveFocus()
        expect(screen.getByDisplayValue("Consonant")).toBeInTheDocument()
    })

    it("imports a chosen .awkw file", async () => {
        const user = userEvent.setup()
        await renderApp()
        const dialog = await openAwkwordsDialog(user)
        const file = new File(["#awkwords version 1.2\nV:a/i/u\nr:CV\nn:7\n"], "Test.awkw")
        await user.upload(dialog.querySelector<HTMLInputElement>("input[type=file]")!, file)

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(screen.getByLabelText("Language")).toHaveValue("Test")
        expect(screen.getByLabelText("Word count")).toHaveValue("7")
        expect(screen.getByRole("region", {name: "Awkwords import notes"})).toHaveTextContent("The letter C has no subpattern")
    })
})
