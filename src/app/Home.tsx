import {CSSProperties, lazy, Suspense, useEffect, useMemo, useRef, useState} from "react";
import {Bounce, ToastContainer} from "react-toastify";

import {configToGrammar, GrammarError} from "@/engine/buildGrammar.ts";
import {ErrorLocation, GrammarErrorContext} from "@/features/config/grammarError.ts";
import {Configuration} from "@/features/config/Configuration.tsx";
import {GrammarToolbar} from "@/features/config/GrammarToolbar.tsx";
import {Generator} from "@/features/generator/Generator.tsx";
import {useGeneratorView} from "@/features/generator/useGeneratorView.ts";
import {Navbar} from "./Navbar.tsx";
import {Tab, tabs} from "./tabs.ts";
import {useUrlConfig} from "./useUrlConfig.ts";
import {useMediaQuery} from "./useMediaQuery.ts";
import {PanelSplitter} from "./PanelSplit.tsx";
import {usePanelSplit} from "./panelSplitPref.ts";

// The docs tabs are reading material most visits never open, so they load on demand (the static pages carry them
// for crawlers and for reading without the app).
const Reference = lazy(() => import("@/features/docs/Reference.tsx").then(m => ({default: m.Reference})))
const Faq = lazy(() => import("@/features/docs/Faq.tsx").then(m => ({default: m.Faq})))

// Holds the space while a docs chunk loads; focus has already moved to the labelled main landmark.
const docsFallback = <div aria-busy="true" className="grow"/>

export const Home = () => {

    const [tab, setTab] = useState<Tab>("generator")
    const {config, dispatch, synced} = useUrlConfig()
    const view = useGeneratorView()
    // The output comes first on small screens so the words are not buried under the rules. The DOM follows the visual
    // order (rather than CSS reordering) so keyboard and screen reader order match; keys keep each panel's state when it moves.
    const desktop = useMediaQuery("(min-width: 768px)")

    // Switching views swaps the content under a focused nav button, which assistive tech wouldn't notice.
    // Moving focus to the labelled main landmark announces the new view and starts reading from it.
    const main = useRef<HTMLElement>(null)
    const panels = useRef<HTMLDivElement>(null)
    const [split, setSplit] = usePanelSplit()
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
                if (e instanceof GrammarError) location = {ruleId: e.ruleId, itemId: e.itemId, message: error}
            }
            return [grammar, error, location]
        },
        [config]
    )

    const configuration = <Configuration key="configuration" config={config} dispatch={dispatch}/>
    const output = <Generator key="output" config={config} grammar={grammar} error={error} dispatch={dispatch} view={view}/>

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
            <div className="flex flex-col bg-background text-on-surface justify-stretch h-screen">
                {/* Off-screen until focused: the configuration has dozens of tab stops before the generator. */}
                {tab === "generator" ? (
                    <button onClick={skipToGenerator}
                            className="absolute -top-20 left-2 z-50 rounded-md bg-primary text-white p-2 focus:top-2">
                        Skip to generator
                    </button>
                ) : null}
                <Navbar tab={tab} setTab={selectTab}/>
                <main ref={main} tabIndex={-1} aria-label={tabs.find(t => t.id === tab)?.label}
                      className="flex flex-col grow min-h-0 outline-none">
                    {
                        tab === "generator" && synced ?
                            <GrammarErrorContext value={errorLocation}>
                                <GrammarToolbar config={config} dispatch={dispatch} view={view}/>
                                {/* --split sizes the grammar panel; the words panel takes the rest. */}
                                <div ref={panels} style={{"--split": `${split}%`} as CSSProperties}
                                     className="flex flex-col grow min-h-0 md:relative md:flex-row md:overflow-hidden">
                                    {desktop ?
                                        [configuration,
                                            <PanelSplitter key="splitter" split={split} onChange={setSplit} container={panels}/>,
                                            output] :
                                        [output, configuration]}
                                </div>
                            </GrammarErrorContext> : null
                    }
                    {tab === "reference" ? <Suspense fallback={docsFallback}><Reference/></Suspense> : null}
                    {tab === "faq" ? <Suspense fallback={docsFallback}><Faq/></Suspense> : null}
                </main>
            </div>
        </>
    )
}
