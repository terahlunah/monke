import {describe, expect, it} from "vitest"
import {render, screen} from "@testing-library/react"
import {renderToStaticMarkup} from "react-dom/server"
import {atomFeed, entryId} from "./feed.ts"
import {ReleaseArticle, ReleaseBody, ReleaseText} from "./ReleaseNotes.tsx"
import {formatReleaseDate, releaseAnchor, releases, stampNewer} from "./releases.ts"

describe("release data", () => {
    it("has ISO dates, newest first", () => {
        for (const r of releases) {
            expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(Number.isNaN(new Date(r.date).getTime())).toBe(false)
        }
        const dates = releases.map(r => r.date)
        expect(dates).toEqual([...dates].sort().reverse())
    })

    it("has unique semver versions with a unique anchor each", () => {
        const versions = releases.map(r => r.version)
        expect(new Set(versions).size).toBe(versions.length)
        for (const v of versions) expect(v).toMatch(/^\d+\.\d+\.\d+$/)
        expect(new Set(releases.map(releaseAnchor)).size).toBe(releases.length)
    })

    it("has no empty sections or items", () => {
        for (const r of releases) {
            expect(r.sections.length).toBeGreaterThan(0)
            for (const s of r.sections) {
                expect(s.title).not.toBe("")
                expect(s.items.length).toBeGreaterThan(0)
                s.items.forEach(item => expect(item.trim()).not.toBe(""))
            }
        }
    })

    it("formats dates in English without shifting the day", () => {
        expect(formatReleaseDate("2026-10-27")).toBe("October 27, 2026")
        expect(formatReleaseDate("2024-02-24")).toBe("February 24, 2024")
    })
})

describe("stampNewer", () => {
    it("compares by date, then by numeric version", () => {
        expect(stampNewer("2026-10-27#2.0.0", "2024-02-24#1.0.0")).toBe(true)
        expect(stampNewer("2024-02-24#1.0.0", "2026-10-27#2.0.0")).toBe(false)
        expect(stampNewer("2026-10-27#2.10.0", "2026-10-27#2.9.0")).toBe(true)
        expect(stampNewer("2026-10-27#2.0.0", "2026-10-27#2.0.0")).toBe(false)
    })
})

describe("ReleaseText", () => {
    it("renders code spans and issue references as links to the issue", () => {
        render(<p><ReleaseText text="Ban a final h with `'h'.$` (#21), see (#14)."/></p>)
        expect(screen.getByText("'h'.$").tagName).toBe("CODE")
        expect(screen.getByRole("link", {name: "#21"})).toHaveAttribute("href", "https://github.com/terahlunah/monke/issues/21")
        expect(screen.getByRole("link", {name: "#14"})).toHaveAttribute("href", "https://github.com/terahlunah/monke/issues/14")
    })

    it("adds a new-tab hint to issue links on request", () => {
        render(<p><ReleaseText text="Fixed (#22)" newTab/></p>)
        const link = screen.getByRole("link", {name: /^#22\s*\(opens in a new tab\)$/})
        expect(link).toHaveAttribute("target", "_blank")
    })

    it("renders every issue reference in the data as a link", () => {
        const refs = releases.flatMap(r => r.sections.flatMap(s => s.items)).join(" ").match(/\(#\d+\)/g) ?? []
        expect(refs.length).toBeGreaterThan(0)
        const {container} = render(<>{releases.map(r => <ReleaseArticle key={r.version} release={r} level={2}/>)}</>)
        expect(container.querySelectorAll("a[href^='https://github.com/terahlunah/monke/issues/']")).toHaveLength(refs.length)
        expect(container.textContent).not.toContain("`")
    })
})

describe("ReleaseArticle", () => {
    it("has the version heading, a machine-readable date and section headings one level below", () => {
        const {container} = render(<ReleaseArticle release={releases[0]} level={3} anchor/>)
        expect(screen.getByRole("heading", {level: 3, name: `v${releases[0].version}`})).toBeInTheDocument()
        expect(screen.getAllByRole("heading", {level: 4}).map(h => h.textContent)).toEqual(releases[0].sections.map(s => s.title))
        expect(container.querySelector("time")).toHaveAttribute("datetime", releases[0].date)
        expect(container.querySelector("article")).toHaveAttribute("id", releaseAnchor(releases[0]))
    })
})

describe("atomFeed", () => {
    const xml = atomFeed(releases, r => renderToStaticMarkup(<ReleaseBody release={r} level={3}/>))
    const doc = new DOMParser().parseFromString(xml, "application/xml")

    it("is well-formed", () => {
        expect(doc.querySelector("parsererror")).toBeNull()
        expect(doc.documentElement.namespaceURI).toBe("http://www.w3.org/2005/Atom")
    })

    it("has one entry per release with a stable tag id, a title and an anchored link", () => {
        const entries = [...doc.querySelectorAll("entry")]
        expect(entries).toHaveLength(releases.length)
        entries.forEach((e, i) => {
            const r = releases[i]
            expect(e.querySelector("id")?.textContent).toBe(entryId(r))
            expect(e.querySelector("title")?.textContent).toBe(`Monke v${r.version}`)
            expect(e.querySelector("link")?.getAttribute("href")).toBe(`https://monke.lunah.dev/news/#${releaseAnchor(r)}`)
            expect(e.querySelector("content")?.getAttribute("type")).toBe("html")
            expect(e.querySelector("content")?.textContent).toContain("<li>")
        })
        expect(entryId(releases[0])).toBe(`tag:monke.lunah.dev,${releases[0].date}:${releases[0].version}`)
    })

    it("is updated as of the newest release", () => {
        expect(doc.querySelector("feed > updated")?.textContent).toBe(`${releases[0].date}T00:00:00Z`)
    })
})
