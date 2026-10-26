import {describe, expect, it} from "vitest"
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
