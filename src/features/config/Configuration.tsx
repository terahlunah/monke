import {Col} from "@/components/Col.tsx";
import {RuleInstance} from "./RuleInstance.tsx";
import {Row} from "@/components/Row.tsx";
import {SortableList} from "@/components/SortableList.tsx";
import {Config} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {Dispatch} from "react";

type ConfigurationProps = {
    config: Config
    dispatch: Dispatch<ConfigAction>
}

export const Configuration = ({config, dispatch}: ConfigurationProps) => {

    return (

        <section aria-labelledby="config-heading"
                 className="flex flex-col grow bg-background p-4 md:p-6 gap-2 md:basis-0 md:grow-[2] md:overflow-auto md:no-scrollbar">
            <h2 id="config-heading" className="sr-only">Grammar configuration</h2>


            <Col>
                <Col className="gap-4">

                    <SortableList items={config.rules} onMove={(from, to) => dispatch({type: "moveRule", from, to})}
                                  direction="vertical"
                                  describe={r => `rule ${r.name || "unnamed"}`}>
                        {config.rules.map((r, index) =>
                            <RuleInstance rule={r}
                                          index={index}
                                          total={config.rules.length}
                                          onMove={to => dispatch({type: "moveRule", from: index, to})}
                                          dispatch={dispatch}
                                          enableWeights={config.enableWeights}
                                          enableSerif={config.enableSerif}
                                          key={r.id}
                            />)}
                    </SortableList>

                    <Row className="gap-4">
                        <button onClick={() => dispatch({type: "addRule", terminalOnly: true})} className="grow bg-primary rounded-sm p-1">
                            Add Terminal Rule
                        </button>
                        <button onClick={() => dispatch({type: "addRule", terminalOnly: false})} className="grow bg-secondary rounded-sm p-1">
                            Add Rule
                        </button>
                    </Row>
                </Col>

            </Col>

        </section>
    )
}