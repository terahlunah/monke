import {Dispatch} from "react";
import {PlusIcon} from "lucide-react";
import {SortableList} from "@/components/SortableList.tsx";
import {Config} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {RuleInstance} from "./RuleInstance.tsx";
import {FeaturesPanel} from "./FeaturesPanel.tsx";

type ConfigurationProps = {
    config: Config
    dispatch: Dispatch<ConfigAction>
}

const addRule = "flex h-11 md:h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface hover:bg-white/5"

export const Configuration = ({config, dispatch}: ConfigurationProps) => {

    return (
        <section aria-labelledby="config-heading"
                 className="flex flex-col p-4 md:p-6 gap-3 md:basis-[var(--split,60%)] md:grow-0 md:shrink md:min-w-[420px] md:overflow-auto md:no-scrollbar">
            <h2 id="config-heading" className="sr-only">Grammar configuration</h2>

            <FeaturesPanel features={config.features} dispatch={dispatch} enableWeights={config.enableWeights}/>

            <SortableList items={config.rules} onMove={(from, to) => dispatch({type: "moveRule", from, to})}
                          direction="vertical"
                          describe={r => `rule ${r.name || "unnamed"}`}>
                <div className="flex flex-col gap-3">
                    {config.rules.map((r, index) =>
                        <RuleInstance rule={r}
                                      index={index}
                                      total={config.rules.length}
                                      isRoot={r.name === config.root}
                                      onMove={to => dispatch({type: "moveRule", from: index, to})}
                                      dispatch={dispatch}
                                      enableWeights={config.enableWeights}
                                      enableSerif={config.enableSerif}
                                      features={config.features}
                                      key={r.id}
                        />)}
                </div>
            </SortableList>

            <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button type="button" onClick={() => dispatch({type: "addRule", terminalOnly: true})}
                        className={`${addRule} text-terminal`} aria-label="Add terminal rule">
                    <PlusIcon className="size-4" aria-hidden="true"/>
                    Terminal rule
                </button>
                <button type="button" onClick={() => dispatch({type: "addRule", terminalOnly: false})}
                        className={`${addRule} text-pattern`} aria-label="Add pattern rule">
                    <PlusIcon className="size-4" aria-hidden="true"/>
                    Pattern rule
                </button>
            </div>
        </section>
    )
}
