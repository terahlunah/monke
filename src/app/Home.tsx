import {useEffect, useMemo, useState} from "react";
import {Bounce, ToastContainer} from "react-toastify";
import {Linear} from "@/components/Linear.tsx";
import {Col} from "@/components/Col.tsx";
import {configToGrammar} from "@/engine/buildGrammar.ts";
import {Configuration} from "@/features/config/Configuration.tsx";
import {Generator} from "@/features/generator/Generator.tsx";
import {Guide} from "@/features/docs/Guide.tsx";
import {Faq} from "@/features/docs/Faq.tsx";
import {DesktopNavbar, MobileNavbar, Tab} from "./Navbar.tsx";
import {useUrlConfig} from "./useUrlConfig.ts";

export const Home = () => {

    const [tab, setTab] = useState<Tab>("generator")
    const {config, dispatch, synced} = useUrlConfig()

    useEffect(() => {
        document.title = `Monke - ${config.language}`;
    }, [config]);

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
                            <Configuration config={config} dispatch={dispatch}/>
                            <Generator config={config}
                                       grammar={grammar}
                                       error={error}
                                       dispatch={dispatch}/>
                        </Linear> : null
                }
                {tab === "guide" ? <Guide/> : null}
                {tab === "faq" ? <Faq/> : null}

            </Col>
        </>
    )
}
