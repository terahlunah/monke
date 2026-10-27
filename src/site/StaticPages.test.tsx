import {describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import axe from "axe-core"
import {StaticPageBody} from "./StaticPages.tsx"
import {staticPages} from "./pages.ts"

const hrefs = {awkwords: "https://monke.lunah.dev/x"}

describe.each(staticPages)("static page $path", page => {
    it("has one h1 and no skipped heading levels", () => {
        const {container} = render(<StaticPageBody page={page} hrefs={hrefs}/>)
        expect(screen.getAllByRole("heading", {level: 1}).map(h => h.textContent)).toEqual([page.heading])
        const levels = [...container.querySelectorAll("h1, h2, h3, h4")].map(h => Number(h.tagName[1]))
        levels.forEach((level, i) => {
            if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1)
        })
    })

    it("passes axe", async () => {
        const {container} = render(<StaticPageBody page={page} hrefs={hrefs}/>)
        // jsdom can't compute contrast; the page uses the app's checked palette.
        const {violations} = await axe.run(container, {rules: {"color-contrast": {enabled: false}}})
        expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(", ")}`)).toEqual([])
    })

    it("links back to the generator", () => {
        render(<StaticPageBody page={page} hrefs={hrefs}/>)
        expect(screen.getByRole("link", {name: "Open the generator"})).toHaveAttribute("href", "/")
    })
})
