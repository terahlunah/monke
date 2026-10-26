import {Linear} from "../components/Linear.tsx";
import {Guide} from "../panels/Guide.tsx";
import {Configuration} from "../panels/Configuration.tsx";
import {Generator} from "../panels/Generator.tsx";
import {useEffect, useMemo, useRef, useState} from "react";
import {Bounce, ToastContainer} from "react-toastify";
import {Col} from "../components/Col.tsx";
import {Row} from "../components/Row.tsx";
import {defaultConfig, emptyConfig} from "../engine/defaults.ts";
import {GithubIcon} from "../components/GithubIcon.tsx";
import {configToGrammar} from "../engine/buildGrammar.ts";
import {Config, Rule} from "../engine/config.ts";
import {encodeConfig, decodeConfig} from "../engine/sharing.ts"
import {Faq} from "../panels/Faq.tsx";
import {Menu, MenuButton, MenuItem, MenuItems} from "@headlessui/react";
import {MenuIcon} from "lucide-react";
import {GenericProps} from "../components/GenericProps.tsx";

export const Home = () => {

    // The URL path is only read once at startup; afterwards it just mirrors the config.
    const [urlConfig] = useState(() => window.location.pathname.slice(1))

    const [tab, setTab] = useState<"generator" | "guide" | "faq">("generator")

    const [config, setConfig] = useState<Config>(urlConfig ? emptyConfig : defaultConfig)
    // Holds back URL writes until a link in the path has been decoded, so it isn't overwritten by the empty config.
    const [synced, setSynced] = useState(!urlConfig)

    useEffect(() => {
        if (!urlConfig) return

        decodeConfig(urlConfig)
            .then(setConfig)
            .catch(e => {
                console.error(e)
                setConfig(defaultConfig)
            })
            .finally(() => setSynced(true))
    }, [urlConfig])

    // Cancels the debounced URL write of the latest edit; popstate uses it so a stale edit can't push over a restored entry.
    const cancelPendingWrite = useRef<() => void>(() => {})
    // Set when the next config change comes from history, so mirroring it into the URL must not push an entry.
    const restoring = useRef(false)
    // The first write only normalizes the initial URL; it must not create an extra entry to go back to.
    const firstWrite = useRef(true)

    useEffect(() => {
        let latest = 0
        const onPopState = () => {
            cancelPendingWrite.current()
            const path = window.location.pathname.slice(1)
            const id = ++latest
            const restore = (c: Config) => {
                if (id !== latest) return
                restoring.current = true
                setConfig(c)
            }
            if (!path) return restore(defaultConfig)
            decodeConfig(path).then(restore).catch(console.error)
        }
        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [])

    useEffect(() => {
        document.title = `Monke - ${config.language}`;
    }, [config]);

    useEffect(() => {
        if (!synced) return
        if (restoring.current) {
            restoring.current = false
            return
        }

        let cancelled = false
        // Encoding is async and the config changes on every keystroke: debounce so a burst of edits is one undo step, and drop stale results.
        const timer = setTimeout(() => {
            encodeConfig(config)
                .then(data => {
                    if (cancelled) return
                    const path = `/${data}`
                    if (firstWrite.current) {
                        firstWrite.current = false
                        window.history.replaceState(null, "", path)
                    } else if (path !== window.location.pathname) {
                        window.history.pushState(null, "", path)
                    }
                })
                .catch(console.error)
        }, 300)

        const cancel = () => {
            cancelled = true
            clearTimeout(timer)
        }
        cancelPendingWrite.current = cancel
        return cancel
    }, [config, synced])

    const updateConfig = (patch: Partial<Config>) => {
        setConfig(c => ({...c, ...patch}))
    }

    const setRules = (root: string | null, rules: Rule[]) => {
        updateConfig({root, rules})
    }

    const [grammar, error] = useMemo(() => {
            let grammar = null
            let error = null
            try {
                grammar = configToGrammar(config)
            } catch (e) {
                error = (e as Error).message
            }
            return [grammar, error]
        },
        [config]
    )

    return (
        <>
            <ToastContainer
                position="bottom-center"
                autoClose={2000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                transition={Bounce}
            />
            <Col className="bg-surface text-on-surface justify-stretch h-screen">
                <DesktopNavbar className="hidden md:flex" tab={tab} setTab={setTab}/>
                <MobileNavbar className="md:hidden" tab={tab} setTab={setTab}/>
                {
                    tab === "generator" && synced ?
                        <Linear className="md:overflow-auto grow">
                            <Configuration config={config}
                                           setRules={setRules}
                                           updateConfig={updateConfig}/>
                            <Generator config={config}
                                       grammar={grammar}
                                       error={error}
                                       updateConfig={updateConfig}/>
                        </Linear> : null
                }
                {tab === "guide" ? <Guide/> : null}
                {tab === "faq" ? <Faq/> : null}

            </Col>
        </>
    )
}

type NavbarProps = {
    tab: string
    setTab: (tab: "generator" | "guide" | "faq") => void
}

const DesktopNavbar = ({tab, setTab, className}: GenericProps<NavbarProps>) => {
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
const MobileNavbar = ({tab, setTab, className}: GenericProps<NavbarProps>) => {
    const tabStyle = (t: string): string => t === tab ? "text-primary text-left" : "text-white text-left"

    return (

        <Menu as="nav" className={`${className} gap-4 p-2 items-center flex flex-row justify-between`}>

            <Row className="ml-2 gap-4 p-2 items-center justify-start">
                <h1 className="text-xl font-bold">Monke</h1>
                <div className="border-l border-white/20 h-8"/>
                <h2 className="text-lg text-on-surface/80">Word generator</h2>
            </Row>

            <div className="py-4 mr-2 relative">
                <MenuButton className="">
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
