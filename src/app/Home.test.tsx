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

    describe("history", () => {
        const settled = async () => {
            await screen.findByText(/possible branches/)
            await waitFor(() => expect(window.location.pathname).not.toBe("/"))
        }
        const pause = () => new Promise(r => setTimeout(r, 600))

        it("pushes one entry per burst of edits", async () => {
            const user = userEvent.setup()
            renderAt("/")
            await settled()
            const entries = window.history.length

            await user.type(screen.getByLabelText("Language"), "abc")
            await waitFor(() => expect(window.history.length).toBe(entries + 1))
            await pause()
            expect(window.history.length).toBe(entries + 1)
        })

        it("restores the previous config on Back and the next on Forward without pushing", async () => {
            const user = userEvent.setup()
            renderAt("/")
            await settled()
            const entries = window.history.length

            await user.type(screen.getByLabelText("Language"), "X")
            await waitFor(() => expect(window.history.length).toBe(entries + 1))

            window.history.back()
            await waitFor(() => expect(screen.getByLabelText("Language")).toHaveValue("toki pona"))
            await pause()
            expect(window.history.length).toBe(entries + 1)

            window.history.forward()
            await waitFor(() => expect(screen.getByLabelText("Language")).toHaveValue("toki ponaX"))
            await pause()
            expect(window.history.length).toBe(entries + 1)
        })
    })


    it("labels its main inputs", async () => {
        renderAt("/")
        await screen.findByText(/possible branches/)

        expect(screen.getByLabelText("Language")).toHaveValue("toki pona")
        expect(screen.getByLabelText("Word count")).toHaveValue("50")
        expect(screen.getAllByLabelText("Rule name")[0]).toBeInTheDocument()
        expect(screen.getByRole("button", {name: /Start rule/})).toBeInTheDocument()
    })

    it("adds and removes patterns in a rule", async () => {
        const user = userEvent.setup()
        renderAt("/")
        await screen.findByText(/possible branches/)

        const before = screen.getAllByRole("button", {name: /^Delete (pattern|terminal)/}).length
        await user.click(screen.getAllByRole("button", {name: /^Add (pattern|terminal)/})[0])
        expect(screen.getAllByRole("button", {name: /^Delete (pattern|terminal)/})).toHaveLength(before + 1)

        await user.click(screen.getAllByRole("button", {name: /^Delete (pattern|terminal)/})[0])
        expect(screen.getAllByRole("button", {name: /^Delete (pattern|terminal)/})).toHaveLength(before)
    })

    it("gives a cloned rule its own ids", async () => {
        const user = userEvent.setup()
        renderAt("/")
        await screen.findByText(/possible branches/)

        await user.click(screen.getAllByRole("button", {name: /^Duplicate rule/})[0])

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

    it("lists every word with Generate all and announces the count", async () => {
        const user = userEvent.setup()
        renderAt(`/${customLink}`)
        expect(await screen.findByText("Grammar has 6 possible branches")).toBeInTheDocument()

        await user.click(screen.getByRole("button", {name: "Generate all"}))

        expect(await screen.findByText("a i ta ti", {selector: "p"})).toBeInTheDocument()
        expect(screen.getByText("Listed 4 words")).toBeInTheDocument()
    })
})
