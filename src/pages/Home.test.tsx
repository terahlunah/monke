import {describe, expect, it} from "vitest"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MemoryRouter, Route, Routes} from "react-router"
import {Home} from "./Home.tsx"

const renderAt = (path: string) => render(
    <MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/:urlConfig" element={<Home/>}/>
        </Routes>
    </MemoryRouter>
)

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
