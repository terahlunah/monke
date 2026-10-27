import {describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {HelpTip} from "./HelpTip.tsx"

const setup = () => render(<HelpTip label="About things" section="reference-things">Some help.</HelpTip>)

describe("HelpTip", () => {
    it("opens with the keyboard, links to the Reference section and closes on Escape with focus back", async () => {
        const user = userEvent.setup()
        setup()
        const button = screen.getByRole("button", {name: "About things"})
        await user.tab()
        expect(button).toHaveFocus()
        await user.keyboard("{Enter}")
        expect(await screen.findByText("Some help.")).toBeInTheDocument()
        const link = screen.getByRole("link", {name: /Read more in the Reference/})
        expect(link).toHaveAttribute("href", "/reference/#reference-things")
        expect(link).toHaveAttribute("target", "_blank")
        await user.keyboard("{Escape}")
        expect(screen.queryByText("Some help.")).not.toBeInTheDocument()
        expect(button).toHaveFocus()
    })

    it("closes on an outside click", async () => {
        const user = userEvent.setup()
        render(<><HelpTip label="About things" section="x">Some help.</HelpTip><p>outside</p></>)
        await user.click(screen.getByRole("button", {name: "About things"}))
        await screen.findByText("Some help.")
        await user.click(screen.getByText("outside"))
        expect(screen.queryByText("Some help.")).not.toBeInTheDocument()
    })
})
