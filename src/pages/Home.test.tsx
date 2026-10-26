import {describe, expect, it} from "vitest"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {Home} from "./Home.tsx"

const renderAt = (path: string) => {
    window.history.replaceState(null, "", path)
    return render(<Home/>)
}

// Frozen link (see sharing.test.ts): root Word = C.V / V, rewrite k+vowel -> vowel.
// Reachable words are therefore limited to a, i, ta, ti.
const customLink = "H4sIAAAAAAAACmNiSyvKr0rNYwnPL0phZGAG0wyMjAxMzM56YQwMDfaMEJJVPVtdL4xZ2VCZkUU9O1ud0ZmRgYGBiTEbLFsCUcnIwMDIxJgI5mSCSAAm97oyXwAAAA~~"

describe("Home", () => {
    it("loads the default Toki Pona grammar", async () => {
        renderAt("/")
        await waitFor(() => expect(document.title).toBe("Monke - toki pona"))
        expect(await screen.findByText(/possible branches/)).toBeInTheDocument()
        expect(screen.getByDisplayValue("Consonant")).toBeInTheDocument()
    })

    it("mirrors the config into the URL without adding history entries", async () => {
        const entries = window.history.length
        renderAt("/")
        await waitFor(() => expect(window.location.pathname).not.toBe("/"))
        expect(window.history.length).toBe(entries)
    })

    it("adds and removes patterns in a rule", async () => {
        const user = userEvent.setup()
        renderAt("/")
        await screen.findByText(/possible branches/)

        const before = screen.getAllByRole("button", {name: "Delete pattern"}).length
        await user.click(screen.getAllByRole("button", {name: "Add pattern"})[0])
        expect(screen.getAllByRole("button", {name: "Delete pattern"})).toHaveLength(before + 1)

        await user.click(screen.getAllByRole("button", {name: "Delete pattern"})[0])
        expect(screen.getAllByRole("button", {name: "Delete pattern"})).toHaveLength(before)
    })

    it("gives a cloned rule its own ids", async () => {
        const user = userEvent.setup()
        renderAt("/")
        await screen.findByText(/possible branches/)

        await user.click(screen.getAllByRole("button", {name: "Duplicate rule"})[0])

        const ids = [...document.querySelectorAll("[id]")].map(e => e.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("generates words when clicking Generate", async () => {
        const user = userEvent.setup()
        renderAt("/")
        await screen.findByText(/possible branches/)
        await waitFor(() => expect(document.title).toBe("Monke - toki pona"))

        await user.click(screen.getByRole("button", {name: "Generate"}))

        const output = await screen.findByText(/^[a-z]+( [a-z]+)*$/, {selector: "p"})
        expect(output.textContent!.split(" ")).toHaveLength(50)
    })

    it("restores a config from the URL path", async () => {
        const user = userEvent.setup()
        renderAt(`/${customLink}`)
        await waitFor(() => expect(document.title).toBe("Monke - frozen"))
        expect(await screen.findByText("Grammar has 6 possible branches")).toBeInTheDocument()
        expect(screen.queryByDisplayValue("Consonant")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "Generate"}))

        const output = await screen.findByText(/^[a-z]+( [a-z]+)*$/, {selector: "p"})
        for (const w of output.textContent!.split(" ")) expect(["a", "i", "ta", "ti"]).toContain(w)
    })
})
