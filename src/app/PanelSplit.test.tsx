import {beforeEach, describe, expect, it} from "vitest"
import {useRef} from "react"
import userEvent from "@testing-library/user-event"
import {render, screen} from "@testing-library/react"
import {PanelSplitter} from "./PanelSplit.tsx"
import {DEFAULT_SPLIT, MAX_SPLIT, MIN_SPLIT, usePanelSplit} from "./panelSplitPref.ts"

const Harness = () => {
    const container = useRef<HTMLDivElement>(null)
    const [split, setSplit] = usePanelSplit()
    return <div ref={container}><PanelSplitter split={split} onChange={setSplit} container={container}/></div>
}

describe("panel splitter", () => {
    beforeEach(() => window.localStorage.clear())

    it("starts at the default and resizes with the keyboard", async () => {
        const user = userEvent.setup()
        render(<Harness/>)
        const separator = screen.getByRole("separator", {name: "Resize the grammar and words panels"})
        expect(separator).toHaveAttribute("aria-valuenow", String(DEFAULT_SPLIT))

        separator.focus()
        await user.keyboard("{ArrowRight}")
        expect(separator).toHaveAttribute("aria-valuenow", String(DEFAULT_SPLIT + 2))
        await user.keyboard("{Home}")
        expect(separator).toHaveAttribute("aria-valuenow", String(MIN_SPLIT))
        await user.keyboard("{End}")
        expect(separator).toHaveAttribute("aria-valuenow", String(MAX_SPLIT))
        await user.keyboard("{Enter}")
        expect(separator).toHaveAttribute("aria-valuenow", String(DEFAULT_SPLIT))
    })

    it("remembers the split in this browser", async () => {
        const user = userEvent.setup()
        const {unmount} = render(<Harness/>)
        screen.getByRole("separator").focus()
        await user.keyboard("{ArrowLeft}")
        unmount()

        render(<Harness/>)
        expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", String(DEFAULT_SPLIT - 2))
    })

    it("ignores an unreadable stored value", () => {
        window.localStorage.setItem("monke.panelSplit", "nonsense")
        render(<Harness/>)
        expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", String(DEFAULT_SPLIT))
    })
})
