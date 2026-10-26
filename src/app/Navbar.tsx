import {Menu, MenuButton, MenuItem, MenuItems} from "@headlessui/react";
import {MenuIcon} from "lucide-react";
import {Row} from "@/components/Row.tsx";
import {Col} from "@/components/Col.tsx";
import {GithubIcon} from "@/components/GithubIcon.tsx";
import {GenericProps} from "@/components/GenericProps.tsx";

export type Tab = "generator" | "guide" | "faq"

type NavbarProps = {
    tab: Tab
    setTab: (tab: Tab) => void
}

export const DesktopNavbar = ({tab, setTab, className}: GenericProps<NavbarProps>) => {
    const tabStyle = (t: string): string => t === tab ? "bg-primary/40 text-xl rounded-sm p-1 px-2" : "text-white text-xl p-1 px-2"

    return (
        <Row className={`${className} gap-4 items-center justify-between mx-2`}>
            <Row className="gap-4 p-2 items-center justify-start">
                <h1 className="text-xl font-bold">Monke</h1>
                <div className="border-l border-white/20 h-8"/>
                <h2 className="text-lg text-on-surface/80">A grammar based word generator</h2>
            </Row>
            <Row className="gap-4 p-2 items-center justify-center">
                <button className={`${tabStyle("generator")}`} onClick={() => setTab("generator")}>Generator
                </button>
                <div className="border-l border-white/20 h-8"/>
                <button className={`${tabStyle("guide")}`} onClick={() => setTab("guide")}>Guide</button>
                <div className="border-l border-white/20 h-8"/>
                <button className={`${tabStyle("faq")}`} onClick={() => setTab("faq")}>FAQ</button>
            </Row>
            <Row className=" gap-4 p-2 items-center w-1/3 justify-end">
                <h2 className="text-lg text-on-surface/80">Made by Terah</h2>
                <div className="border-l border-white/20 h-8"/>
                <a href="https://github.com/terahlunah/monke" target="_blank" rel="noreferrer noopener" aria-label="GitHub">
                    <GithubIcon className="size-8"/>
                </a>
            </Row>
        </Row>)
}

export const MobileNavbar = ({tab, setTab, className}: GenericProps<NavbarProps>) => {
    const tabStyle = (t: string): string => t === tab ? "text-primary text-left" : "text-white text-left"

    return (

        <Menu as="nav" className={`${className} gap-4 p-2 items-center flex flex-row justify-between`}>

            <Row className="ml-2 gap-4 p-2 items-center justify-start">
                <h1 className="text-xl font-bold">Monke</h1>
                <div className="border-l border-white/20 h-8"/>
                <h2 className="text-lg text-on-surface/80">Word generator</h2>
            </Row>

            <div className="py-4 mr-2 relative">
                <MenuButton className="" aria-label="Menu">
                    <MenuIcon className="size-6"/>
                </MenuButton>
                <MenuItems
                    className="z-20 absolute right-0 top-12 flex flex-col shadow-sm bg-background rounded-sm overflow-hidden divide-y divide-white/20">
                    <Col className="gap-4 p-4">
                        <MenuItem>
                            <button className={`${tabStyle("generator")}`} onClick={() => setTab("generator")}>Generator
                            </button>
                        </MenuItem>
                        <MenuItem>
                            <button className={`${tabStyle("guide")}`} onClick={() => setTab("guide")}>Guide</button>
                        </MenuItem>
                        <MenuItem>
                            <button className={`${tabStyle("faq")}`} onClick={() => setTab("faq")}>FAQ</button>
                        </MenuItem>
                    </Col>
                    <Col className="gap-4 p-4">
                        <MenuItem>
                            <a className="text-left" href="https://github.com/terahlunah/monke" target="_blank"
                               rel="noreferrer noopener">
                                Github
                            </a>
                        </MenuItem>
                    </Col>
                </MenuItems>
            </div>
        </Menu>
    )
}
