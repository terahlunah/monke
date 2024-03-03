import {Linear} from "../components/Linear.tsx";
import {Guide} from "../panels/Guide.tsx";
import {Configuration} from "../panels/Configuration.tsx";
import {Generator} from "../panels/Generator.tsx";
import {useEffect, useMemo, useState} from "react";
import {Bounce, ToastContainer} from "react-toastify";
import {Col} from "../components/Col.tsx";
import {Row} from "../components/Row.tsx";
import {tokiPonaRoot, tokiPonaRules} from "../logic/defaults.ts";
import {FaGithub} from "react-icons/fa";
import {configToGrammar} from "../logic/parser.ts";
import {Rule} from "../models/ui.ts";
import {useParams} from "react-router-dom";
import {encodeConfig, decodeConfig} from "../logic/sharing.ts"
import {Faq} from "../panels/Faq.tsx";
import {Menu} from "@headlessui/react";
import {Bars3Icon} from "@heroicons/react/24/outline";
import {GenericProps} from "../components/GenericProps.tsx";

export type Config = {
    language: string,
    rules: Rule[],
    root: string | null
    enableWeights: boolean,
    enableSerif: boolean,
}

export const Home = () => {

    const {urlConfig} = useParams();

    const [tab, setTab] = useState<"generator" | "guide" | "faq">("generator")

    const [config, setConfig] = useState<Config>({
        language: "",
        rules: [],
        root: null,
        enableWeights: false,
        enableSerif: false,
    })

    useEffect(() => {
        const updateUrl = async () => {
            const data = await encodeConfig(config)
            window.history.replaceState("", "", `/${data}`);
        }

        updateUrl().catch(console.error);
    }, [config])


    useEffect(() => {
        const updateConfigFromUrl = async () => {
            console.log(urlConfig)

            if (urlConfig) {
                const config = await decodeConfig(urlConfig)
                console.log(config)
                setConfig(config)
            } else {
                setConfig({
                    language: "toki pona",
                    rules: tokiPonaRules,
                    root: tokiPonaRoot,
                    enableWeights: false,
                    enableSerif: false,
                })
            }
        }

        updateConfigFromUrl().catch(console.error);
    }, [urlConfig])


    const setEnableWeights = (value: boolean) => {
        setConfig({...config, enableWeights: value})
    }

    const setEnableSerif = (value: boolean) => {
        setConfig({...config, enableSerif: value})
    }

    const setRules = (root: string | null, rules: Rule[]) => {
        setConfig({...config, root: root, rules: rules})
    }

    const [grammar, error] = useMemo(() => {
            let grammar = null
            let error = null
            try {
                grammar = configToGrammar(config)
            } catch (e) {
                console.log(e)
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
                    tab === "generator" ?
                        <Linear className="md:overflow-auto grow">
                            <Configuration config={config}
                                           setRules={setRules}
                                           setConfig={setConfig}/>
                            <Generator config={config}
                                       grammar={grammar}
                                       error={error}
                                       setEnableWeights={setEnableWeights}
                                       setEnableSerif={setEnableSerif}
                                       setConfig={setConfig}/>
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
    const tabStyle = (t: string): string => t === tab ? "bg-primary/40 text-xl rounded p-1 px-2" : "text-white text-xl p-1 px-2"

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
                <a href="https://github.com/terahlunah/monke" target="_blank" rel="noreferrer noopener">
                    <FaGithub className="size-8"/>
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
                <Menu.Button className="">
                    <Bars3Icon className="h-6"/>
                </Menu.Button>
                <Menu.Items
                    className="z-20 absolute right-0 top-12 flex flex-col shadow bg-background rounded overflow-hidden divide-y divide-white/20">
                    <Col className="gap-4 p-4">
                        <Menu.Item>
                            <button className={`${tabStyle("generator")}`} onClick={() => setTab("generator")}>Generator
                            </button>
                        </Menu.Item>
                        <Menu.Item>
                            <button className={`${tabStyle("guide")}`} onClick={() => setTab("guide")}>Guide</button>
                        </Menu.Item>
                        <Menu.Item>
                            <button className={`${tabStyle("faq")}`} onClick={() => setTab("faq")}>FAQ</button>
                        </Menu.Item>
                    </Col>
                    <Col className="gap-4 p-4">
                        <Menu.Item>
                            <a className="text-left" href="https://github.com/terahlunah/monke" target="_blank"
                               rel="noreferrer noopener">
                                Github
                            </a>
                        </Menu.Item>
                    </Col>
                </Menu.Items>
            </div>
        </Menu>
    )
}