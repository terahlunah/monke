import {Col} from "../components/Col.tsx";
import {RuleInstance} from "./RuleInstance.tsx";
import {uid} from "uid";
import cloneDeep from "lodash.clonedeep";
import {Row} from "../components/Row.tsx";
import {closestCenter, DndContext, DragEndEvent, useSensor, useSensors} from "@dnd-kit/core";
import {arrayMove, SortableContext, verticalListSortingStrategy} from "@dnd-kit/sortable";
import {SmartMouseSensor, SmartTouchSensor} from "../components/SmartSensor.ts";
import {Config} from "../pages/Home.tsx";
import {tokiPonaRoot, tokiPonaRules, tokiPonaWeightedRules} from "../logic/defaults.ts";
import {Listbox, Transition} from "@headlessui/react";
import {ChangeEvent, Fragment} from "react";
import {CheckIcon, ChevronUpDownIcon} from "@heroicons/react/24/outline";
import {Rule} from "../models/ui.ts";

type ConfigurationProps = {
    config: Config
    setRules: (root: string | null, rules: Rule[]) => void
    setConfig: (config: Config) => void
}

export const Configuration = ({config, setRules, setConfig}: ConfigurationProps) => {

    const onRuleChangeIndex = (index: number) => {
        return (group: Rule) => {
            const newRules = cloneDeep(config.rules)
            newRules[index] = group
            setRules(config.root, newRules)
        }
    }

    const onRuleCloneIndex = (index: number) => {
        return () => {
            const rule = cloneDeep(config.rules[index])
            rule.name = `${rule.name} clone`

            const newRules = cloneDeep(config.rules)
            newRules.splice(index + 1, 0, rule)
            setRules(config.root, newRules)
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {

            const deletedRule = config.rules[index].name

            const root = deletedRule == config.root ? null : config.root

            const newRules = cloneDeep(config.rules)
            newRules.splice(index, 1)
            setRules(root, newRules)
        }
    }

    const onRuleAdd = () => {
        setRules(config.root, [...config.rules, {
            id: uid(),
            name: "",
            patterns: [],
            rewrites: [],
            exclusions: [],
            terminalOnly: false,
            showRewrites: false,
            showExclusions: false,
        }])
    }

    const onGroupAdd = () => {
        setRules(config.root, [...config.rules, {
            id: uid(),
            name: "",
            patterns: [],
            rewrites: [],
            exclusions: [],
            terminalOnly: true,
            showRewrites: false,
            showExclusions: false,
        }])
    }

    const sensors = useSensors(
        useSensor(SmartMouseSensor), useSensor(SmartTouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const onRulePatternDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (active.id !== over?.id) {

            const oldIndex = config.rules.findIndex(it => it.id === active.id);
            const newIndex = config.rules.findIndex(it => it.id === over?.id);

            const newRules = arrayMove(config.rules, oldIndex, newIndex)
            setRules(config.root, newRules)
        }
    };

    const onSelectRoot = (root: string) => {
        setRules(root, config.rules)
    }

    const onSetLanguage = (e: ChangeEvent<HTMLInputElement>) => {
        const lang = e.target.value;
        setConfig({...config, language: lang})
    }

    return (

        <Col className="bg-background md:w-2/3 p-6 gap-2 md:overflow-auto md:no-scrollbar">

            <Row className="gap-4">
                <button className="bg-accent-danger rounded p-2 w-1/3"
                        onClick={() => setConfig({...config, language: "", root: null, rules: []})}>
                    <Row className="items-center justify-center gap-2">
                        <span>Clear</span>
                    </Row>
                </button>
                <button className="bg-accent-danger rounded p-2 w-1/3"
                        onClick={() => setConfig({
                            ...config,
                            language: "toki pona",
                            root: tokiPonaRoot,
                            rules: tokiPonaRules,
                            enableWeights: false
                        })}>
                    <Row className="items-center justify-center gap-2">
                        <span>toki pona example</span>
                    </Row>
                </button>
                <button className="bg-accent-danger rounded p-2 w-1/3"
                        onClick={() => setConfig({
                            ...config,
                            language: "toki pona",
                            root: tokiPonaRoot,
                            rules: tokiPonaWeightedRules,
                            enableWeights: true
                        })}>
                    <Row className="items-center justify-center gap-2">
                        <span>Weighted toki pona example</span>
                    </Row>
                </button>
            </Row>

            <div className="border-t border-white/20 my-2"/>

            <Row className="gap-3 items-center">
                <h1>Language</h1>
                <div className="rounded overflow-clip">
                    <input value={config.language} onInput={onSetLanguage}
                           className={`bg-surface text-left h-8 outline-0 pl-2 w-72`}/>
                </div>
            </Row>

            <Row className="gap-4 items-center">
                <h1>Start rule</h1>
                <div className="w-72 z-10">
                    <Listbox value={config.root} onChange={onSelectRoot}>
                        <div className="relative">
                            <Listbox.Button
                                className="min-h-8 relative w-full cursor-default rounded bg-surface py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                                <span className="block truncate">{config.root}</span>
                                <span
                                    className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                          <ChevronUpDownIcon
                                              className="h-5 w-5 text-gray-400"
                                              aria-hidden="true"
                                          />
                                        </span>
                            </Listbox.Button>
                            <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0">
                                <Listbox.Options
                                    className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-surface py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                    {config.rules.map((rule) => (
                                        <Listbox.Option
                                            key={rule.id}
                                            className={({active}) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                    active ? 'bg-primary text-on-surface' : 'text-on-surface'
                                                }`
                                            }
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
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                </div>
            </Row>

            <div className="border-t border-white/20 my-2"/>

            <Col>
                <Col className="gap-4">

                    <DndContext sensors={sensors} collisionDetection={closestCenter}
                                onDragEnd={onRulePatternDragEnd}>
                        <SortableContext items={config.rules} strategy={verticalListSortingStrategy}>
                            {config.rules.map((r, index) =>
                                <RuleInstance rule={r}
                                              onRuleChange={onRuleChangeIndex(index)}
                                              onDelete={onRuleDeleteIndex(index)}
                                              enableWeights={config.enableWeights}
                                              enableSerif={config.enableSerif}
                                              onClone={onRuleCloneIndex(index)}
                                />)}
                        </SortableContext>
                    </DndContext>

                    <Row className="gap-4">
                        <button onClick={onGroupAdd} className="grow bg-primary rounded p-1">
                            Add Terminal Rule
                        </button>
                        <button onClick={onRuleAdd} className="grow bg-secondary rounded p-1">
                            Add Rule
                        </button>
                    </Row>
                </Col>

            </Col>

        </Col>
    )
}