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

export type Config = {
    rules: Rule[],
    root: string | null
    enableWeights: boolean,
    enableSerif: boolean,
}

export const Home = () => {

    const {urlConfig} = useParams();

    const [config, setConfig] = useState<Config>({
        rules: [],
        root: null,
        enableWeights: false,
        enableSerif: false,
    })

    useEffect(() => {
        const updateUrl = async () => {
            const data = await encodeConfig(config)
            window.history.replaceState("", "", `/monke/${data}`);
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
            {/*<p>Home {params.config}</p>*/}
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
            <Col className="bg-background text-on-surface justify-stretch h-screen">
                <Row className="gap-4 p-2 items-center justify-between">
                    <Row className="ml-2 gap-4 p-2 items-center">
                        <h1 className="text-xl font-bold">Monke</h1>
                        <div className="border-l border-white/20 h-8"/>
                        <h2 className="text-lg text-on-surface/80">A grammar based word generator</h2>
                    </Row>
                    <Row className="mr-2 gap-4 p-2 items-center">
                        <a href="https://github.com/terahlunah/monke" target="_blank" rel="noreferrer noopener">
                            <FaGithub className="size-8"/>
                        </a>
                    </Row>
                </Row>
                <Linear className="overflow-auto grow">
                    <Guide/>
                    <Configuration config={config}
                                   setRules={setRules}
                                   setConfig={setConfig}/>
                    <Generator config={config}
                               grammar={grammar}
                               error={error}
                               setEnableWeights={setEnableWeights}
                               setEnableSerif={setEnableSerif}
                               setConfig={setConfig}/>
                </Linear>
            </Col>
        </>
    )
}