import {Col} from "../components/Col.tsx";
import {RuleInstance} from "./RuleInstance.tsx";
import {Row} from "../components/Row.tsx";
import {SortableList} from "../components/SortableList.tsx";
import {Config} from "../engine/config.ts";
import {ConfigAction} from "../engine/configReducer.ts";
import {Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions} from "@headlessui/react";
import {Dispatch, FormEvent} from "react";
import {CheckIcon, ChevronsUpDownIcon} from "lucide-react";

type ConfigurationProps = {
    config: Config
    dispatch: Dispatch<ConfigAction>
}

export const Configuration = ({config, dispatch}: ConfigurationProps) => {

    const onSetLanguage = (e: FormEvent<HTMLInputElement>) => {
        dispatch({type: "setLanguage", language: e.currentTarget.value})
    }

    return (

        <Col className="bg-background md:w-2/3 p-6 gap-2 md:overflow-auto md:no-scrollbar">

            <Row className="gap-4">
                <button className="bg-accent-danger rounded-sm p-2 w-1/3"
                        onClick={() => dispatch({type: "clear"})}>
                    <Row className="items-center justify-center gap-2">
                        <span>Clear</span>
                    </Row>
                </button>
                <button className="bg-accent-danger rounded-sm p-2 w-1/3"
                        onClick={() => dispatch({type: "loadExample", weighted: false})}>
                    <Row className="items-center justify-center gap-2">
                        <span>toki pona example</span>
                    </Row>
                </button>
                <button className="bg-accent-danger rounded-sm p-2 w-1/3"
                        onClick={() => dispatch({type: "loadExample", weighted: true})}>
                    <Row className="items-center justify-center gap-2">
                        <span>Weighted toki pona example</span>
                    </Row>
                </button>
            </Row>

            <div className="border-t border-white/20 my-2"/>

            <Row className="gap-3 items-center">
                <label htmlFor="language">Language</label>
                <div className="rounded-sm overflow-clip">
                    <input id="language" value={config.language} onInput={onSetLanguage}
                           className={`bg-surface text-left h-8 outline-0 pl-2 w-72`}/>
                </div>
            </Row>

            <Listbox value={config.root} onChange={root => dispatch({type: "setRoot", root})}>
                <Row className="gap-4 items-center">
                    <ListboxLabel>Start rule</ListboxLabel>
                    <div className="w-72 z-10">
                        <div className="relative">
                            <ListboxButton
                                className="min-h-8 relative w-full cursor-default rounded-sm bg-surface py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                                <span className="block truncate">{config.root}</span>
                                <span
                                    className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                          <ChevronsUpDownIcon
                                              className="h-5 w-5 text-gray-400"
                                              aria-hidden="true"
                                          />
                                        </span>
                            </ListboxButton>
                            <ListboxOptions
                                transition
                                className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-surface py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm transition ease-in duration-100 data-closed:opacity-0">
                                {config.rules.map((rule) => (
                                    <ListboxOption
                                        key={rule.id}
                                        className="relative cursor-default select-none py-2 pl-10 pr-4 text-on-surface data-focus:bg-primary"
                                        value={rule.name}>
                                        {({selected}) => (
                                            <>
                                                <span
                                                    className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                    {rule.name}
                                                </span>
                                                {selected ? (
                                                    <span
                                                        className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface">
                                                        <CheckIcon className="h-5 w-5" aria-hidden="true"/>
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </ListboxOption>
                                ))}
                            </ListboxOptions>
                        </div>
                    </div>
                </Row>
            </Listbox>

            <div className="border-t border-white/20 my-2"/>

            <Col>
                <Col className="gap-4">

                    <SortableList items={config.rules} onMove={(from, to) => dispatch({type: "moveRule", from, to})}
                                  direction="vertical">
                        {config.rules.map(r =>
                            <RuleInstance rule={r}
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

        </Col>
    )
}