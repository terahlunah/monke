import {useEffect, useId, useRef, useState} from "react";
import {MenuIcon} from "lucide-react";
import {GithubIcon} from "@/components/GithubIcon.tsx";
import {NewsButton} from "./NewsButton.tsx";
import {useMediaQuery} from "./useMediaQuery.ts";
import {Tab, tabs} from "./tabs.ts";

const GITHUB_URL = "https://github.com/terahlunah/monke"

type NavbarProps = {
    tab: Tab
    setTab: (tab: Tab) => void
}

// Matches Tailwind's `md` breakpoint. Only one variant is mounted, so the page has a single banner,
// h1 and navigation landmark instead of a CSS-hidden duplicate of each.
export const Navbar = (props: NavbarProps) => {
    const desktop = useMediaQuery("(min-width: 768px)")
    return desktop ? <DesktopNavbar {...props}/> : <MobileNavbar {...props}/>
}

const DesktopNavbar = ({tab, setTab}: NavbarProps) => {
    const tabStyle = (t: Tab): string =>
        `rounded-md px-3 py-1.5 ${t === tab ? "bg-primary-soft text-primary-text font-semibold" : "text-on-surface hover:bg-white/5"}`

    return (
        <header className="flex flex-row items-center gap-6 px-6 h-14 shrink-0 border-b border-line bg-surface">
            <div className="flex flex-row items-baseline gap-3">
                <h1 className="text-xl font-bold">Monke</h1>
                <p className="text-muted">Grammar-based word generator</p>
            </div>
            <nav aria-label="Main" className="flex flex-row gap-1 ml-6">
                {tabs.map(t => (
                    <button key={t.id} className={tabStyle(t.id)} aria-current={t.id === tab ? "page" : undefined}
                            onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
            </nav>
            <div className="grow"/>
            <NewsButton className="size-9"/>
            <p className="text-muted">Made by Terah</p>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" className="flex rounded-md hover:text-primary-text"
               aria-label="GitHub repository (opens in a new tab)">
                <GithubIcon className="size-6"/>
            </a>
        </header>)
}

// A disclosure rather than an ARIA menu: these are page links, and role=menu makes screen readers switch to
// application mode and expect arrow-key navigation. Plain buttons in a list are navigated with Tab like the rest of the page.
const MobileNavbar = ({tab, setTab}: NavbarProps) => {
    const tabStyle = (t: Tab): string => t === tab ? "text-primary-text text-left" : "text-on-surface text-left"
    const [open, setOpen] = useState(false)
    const nav = useRef<HTMLElement>(null)
    const toggle = useRef<HTMLButtonElement>(null)
    const panelId = useId()

    useEffect(() => {
        if (!open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            setOpen(false)
            toggle.current?.focus()
        }
        const onPointerDown = (e: PointerEvent) => {
            if (!nav.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("keydown", onKeyDown)
        document.addEventListener("pointerdown", onPointerDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            document.removeEventListener("pointerdown", onPointerDown)
        }
    }, [open])

    return (
        <header className="flex flex-row items-center justify-between gap-3 px-4 h-[52px] shrink-0 border-b border-line bg-surface">
            <h1 className="text-lg font-bold">Monke</h1>

            <div className="flex flex-row items-center">
            <NewsButton className="size-11"/>
                <nav ref={nav} aria-label="Main" className="relative"
                     // Closes when focus leaves the menu, so a keyboard user tabbing past it doesn't leave it open.
                     onBlur={e => {
                         if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
                     }}>
                    <button ref={toggle} aria-label="Menu" aria-expanded={open} aria-controls={panelId} className="flex size-11 items-center justify-center rounded-md -mr-2.5 hover:bg-white/5"
                            onClick={() => setOpen(!open)}>
                        <MenuIcon className="size-6"/>
                    </button>
                    {open ? (
                        <ul id={panelId}
                            className="z-20 absolute right-0 top-12 flex flex-col shadow-lg border border-line-strong bg-surface rounded-lg overflow-hidden divide-y divide-line min-w-40">
                            <li className="flex flex-col">
                                <ul className="flex flex-col gap-4 p-4">
                                    {tabs.map(t => (
                                        <li key={t.id} className="flex flex-col">
                                            <button className={tabStyle(t.id)} aria-current={t.id === tab ? "page" : undefined}
                                                    onClick={() => {
                                                        setOpen(false)
                                                        setTab(t.id)
                                                    }}>{t.label}</button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                            <li className="flex flex-col p-4">
                                <a className="text-left" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
                                    GitHub<span className="sr-only"> (opens in a new tab)</span>
                                </a>
                            </li>
                        </ul>
                    ) : null}
                </nav>
            </div>
        </header>
    )
}
