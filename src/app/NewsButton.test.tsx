import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {newestRelease, releaseStamp} from "@/site/releases.ts"
import {NewsButton} from "./NewsButton.tsx"
import {resyncNews} from "./newsPref.ts"

const KEY = "monke.newsLastSeen"

const renderWith = (stored: string | null) => {
    if (stored === null) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, stored)
    act(() => resyncNews())
    return render(<NewsButton/>)
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
    vi.restoreAllMocks()
    act(() => resyncNews())
})

describe("news unread dot", () => {
    it("shows for a first-time visitor", () => {
        renderWith(null)
        expect(screen.getByRole("button", {name: "What's new (new updates)"})).toBeInTheDocument()
        expect(screen.getByTestId("news-dot")).toHaveAttribute("aria-hidden", "true")
    })

    it("is hidden once the newest release has been seen", () => {
        renderWith(releaseStamp(newestRelease))
        expect(screen.getByRole("button", {name: "What's new"})).toBeInTheDocument()
        expect(screen.queryByTestId("news-dot")).not.toBeInTheDocument()
    })

    it("shows when the stored stamp is older", () => {
        renderWith("2024-02-24#1.0.0")
        expect(screen.getByRole("button", {name: "What's new (new updates)"})).toBeInTheDocument()
        expect(screen.getByTestId("news-dot")).toBeInTheDocument()
    })

    it("stays hidden when the stored stamp is newer than the newest release", () => {
        renderWith("2999-01-01#9.0.0")
        expect(screen.queryByTestId("news-dot")).not.toBeInTheDocument()
    })

    it("is hidden when storage throws, rather than showing on every visit", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked")
        })
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked")
        })
        act(() => resyncNews())
        render(<NewsButton/>)
        expect(screen.getByRole("button", {name: "What's new"})).toBeInTheDocument()
        expect(screen.queryByTestId("news-dot")).not.toBeInTheDocument()
    })
})

describe("news panel", () => {
    it("opens with the releases, stores the newest as seen and returns focus to the bell on Escape", async () => {
        const user = userEvent.setup()
        renderWith(null)
        const bell = screen.getByRole("button", {name: "What's new (new updates)"})
        await user.click(bell)

        const dialog = await screen.findByRole("dialog", {name: "What's new"}, {timeout: 5000})
        expect(window.localStorage.getItem(KEY)).toBe(releaseStamp(newestRelease))
        expect(screen.queryByTestId("news-dot")).not.toBeInTheDocument()
        expect(screen.getByRole("heading", {level: 3, name: `v${newestRelease.version}`})).toBeInTheDocument()
        expect(screen.getByRole("link", {name: /^All release notes/})).toHaveAttribute("href", "/news/")
        expect(screen.getByRole("link", {name: /^Atom feed/})).toHaveAttribute("href", "/news/feed.xml")

        await user.keyboard("{Escape}")
        expect(dialog).not.toBeInTheDocument()
        await waitFor(() => expect(screen.getByRole("button", {name: "What's new"})).toHaveFocus())
    })

    it("opens from the keyboard and closes with the Close button", async () => {
        const user = userEvent.setup()
        renderWith(null)
        await user.tab()
        expect(screen.getByRole("button", {name: /What's new/})).toHaveFocus()
        await user.keyboard("{Enter}")
        await screen.findByRole("dialog", {name: "What's new"}, {timeout: 5000})
        await user.click(screen.getByRole("button", {name: "Close"}))
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        await waitFor(() => expect(screen.getByRole("button", {name: "What's new"})).toHaveFocus())
    })
})
