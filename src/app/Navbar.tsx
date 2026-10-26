import {Fragment, useEffect, useId, useRef, useState} from "react";
import {MenuIcon} from "lucide-react";
import {GithubIcon} from "@/components/GithubIcon.tsx";
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
    const tabStyle = (t: Tab): string => t === tab ? "bg-primary/40 text-xl rounded-sm p-1 px-2" : "text-white text-xl p-1 px-2"

    return (
        <header className="flex flex-row gap-4 items-center justify-between mx-2">
            <div className="flex flex-row gap-4 p-2 items-center justify-start">
                <h1 className="text-xl font-bold">Monke</h1>
                <div className="border-l border-white/20 h-8"/>
                <p className="text-lg text-on-surface/80">A grammar based word generator</p>
            </div>
            <nav aria-label="Main" className="flex flex-row gap-4 p-2 items-center justify-center">
                {tabs.map((t, i) => (
                    <Fragment key={t.id}>
                        {i > 0 ? <div className="border-l border-white/20 h-8" aria-hidden="true"/> : null}
                        <button className={tabStyle(t.id)} aria-current={t.id === tab ? "page" : undefined}
                                onClick={() => setTab(t.id)}>{t.label}</button>
                    </Fragment>
                ))}
            </nav>
            <div className="flex flex-row gap-4 p-2 items-center w-1/3 justify-end">
                <p className="text-lg text-on-surface/80">Made by Terah</p>
                <div className="border-l border-white/20 h-8"/>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener"
                   aria-label="GitHub repository (opens in a new tab)">
                    <GithubIcon className="size-8"/>
                </a>
            </div>
        </header>)
}

// A disclosure rather than an ARIA menu: these are page links, and role=menu makes screen readers switch to
// application mode and expect arrow-key navigation. Plain buttons in a list are navigated with Tab like the rest of the page.
const MobileNavbar = ({tab, setTab}: NavbarProps) => {
    const tabStyle = (t: Tab): string => t === tab ? "text-primary text-left" : "text-white text-left"
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
        <header className="gap-4 p-2 items-center flex flex-row justify-between">
            <div className="ml-2 flex flex-row gap-4 p-2 items-center justify-start">
                <h1 className="text-xl font-bold">Monke</h1>
                <div className="border-l border-white/20 h-8"/>
                <p className="text-lg text-on-surface/80">Word generator</p>
            </div>

            <nav ref={nav} aria-label="Main" className="py-4 mr-2 relative"
                 // Closes when focus leaves the menu, so a keyboard user tabbing past it doesn't leave it open.
                 onBlur={e => {
                     if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
                 }}>
                <button ref={toggle} aria-label="Menu" aria-expanded={open} aria-controls={panelId}
                        onClick={() => setOpen(!open)}>
                    <MenuIcon className="size-6"/>
                </button>
                {open ? (
                    <ul id={panelId}
                        className="z-20 absolute right-0 top-12 flex flex-col shadow-sm bg-background rounded-sm overflow-hidden divide-y divide-white/20">
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
        </header>
    )
}
