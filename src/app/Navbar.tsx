import {Fragment} from "react";
import {Menu, MenuButton, MenuItem, MenuItems} from "@headlessui/react";
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

const MobileNavbar = ({tab, setTab}: NavbarProps) => {
    const tabStyle = (t: Tab): string => t === tab ? "text-primary text-left data-focus:underline" : "text-white text-left data-focus:underline"

    return (
        <header className="gap-4 p-2 items-center flex flex-row justify-between">
            <div className="ml-2 flex flex-row gap-4 p-2 items-center justify-start">
                <h1 className="text-xl font-bold">Monke</h1>
                <div className="border-l border-white/20 h-8"/>
                <p className="text-lg text-on-surface/80">Word generator</p>
            </div>

            <nav aria-label="Main" className="py-4 mr-2 relative">
                <Menu>
                    <MenuButton aria-label="Menu">
                        <MenuIcon className="size-6"/>
                    </MenuButton>
                    <MenuItems
                        className="z-20 absolute right-0 top-12 flex flex-col shadow-sm bg-background rounded-sm overflow-hidden divide-y divide-white/20">
                        <div className="flex flex-col gap-4 p-4">
                            {tabs.map(t => (
                                <MenuItem key={t.id}>
                                    <button className={tabStyle(t.id)} aria-current={t.id === tab ? "page" : undefined}
                                            onClick={() => setTab(t.id)}>{t.label}</button>
                                </MenuItem>
                            ))}
                        </div>
                        <div className="flex flex-col gap-4 p-4">
                            <MenuItem>
                                <a className="text-left data-focus:underline" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
                                    GitHub<span className="sr-only"> (opens in a new tab)</span>
                                </a>
                            </MenuItem>
                        </div>
                    </MenuItems>
                </Menu>
            </nav>
        </header>
    )
}
