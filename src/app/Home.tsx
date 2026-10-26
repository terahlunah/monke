import {useEffect, useMemo, useRef, useState} from "react";
import {Bounce, ToastContainer} from "react-toastify";
import {Linear} from "@/components/Linear.tsx";

import {configToGrammar, GrammarError} from "@/engine/buildGrammar.ts";
import {ErrorLocation, GrammarErrorContext} from "@/features/config/grammarError.ts";
import {Configuration} from "@/features/config/Configuration.tsx";
import {Generator} from "@/features/generator/Generator.tsx";
import {Reference} from "@/features/docs/Reference.tsx";
import {Faq} from "@/features/docs/Faq.tsx";
import {Navbar} from "./Navbar.tsx";
import {Tab, tabs} from "./tabs.ts";
import {useUrlConfig} from "./useUrlConfig.ts";

export const Home = () => {

    const [tab, setTab] = useState<Tab>("generator")
        const {config, dispatch, synced} = useUrlConfig()

    // Switching views swaps the content under a focused nav button, which assistive tech wouldn't notice.
    // Moving focus to the labelled main landmark announces the new view and starts reading from it.
    const main = useRef<HTMLElement>(null)
    const focusMainOnTabChange = useRef(false)
    const selectTab = (next: Tab) => {
        focusMainOnTabChange.current = next !== tab
        setTab(next)
    }
    useEffect(() => {
        if (!focusMainOnTabChange.current) return
        focusMainOnTabChange.current = false
        main.current?.focus()
    }, [tab])

    const skipToGenerator = () => document.getElementById("generator")?.focus()


    useEffect(() => {
        document.title = `Monke - ${config.language}`;
    }, [config]);

    const [grammar, error, errorLocation] = useMemo(() => {
            let grammar = null
            let error = null
            let location: ErrorLocation | null = null
            try {
                grammar = configToGrammar(config)
            } catch (e) {
                error = (e as Error).message
                if (e instanceof GrammarError) location = {ruleId: e.ruleId, itemId: e.itemId}
            }
            return [grammar, error, location]
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
            <div className="flex flex-col bg-surface text-on-surface justify-stretch h-screen">
                {/* Off-screen until focused: the configuration has dozens of tab stops before the generator. */}
                {tab === "generator" ? (
                    <button onClick={skipToGenerator}
                            className="absolute -top-20 left-2 z-50 rounded-sm bg-primary p-2 focus:top-2">
                        Skip to generator
                    </button>
                ) : null}
                <Navbar tab={tab} setTab={selectTab}/>
                <main ref={main} tabIndex={-1} aria-label={tabs.find(t => t.id === tab)?.label}
                      className="flex flex-col grow min-h-0 outline-none">
                    {
                        tab === "generator" && synced ?
                            <GrammarErrorContext value={errorLocation}>
                                <Linear className="md:overflow-auto grow">
                                    <Configuration config={config} dispatch={dispatch}/>
                                    <Generator config={config}
                                               grammar={grammar}
                                               error={error}
                                               dispatch={dispatch}/>
                                </Linear>
                            </GrammarErrorContext> : null
                    }
                    {tab === "reference" ? <Reference/> : null}
                    {tab === "faq" ? <Faq/> : null}
                </main>
            </div>
        </>
    )
}
