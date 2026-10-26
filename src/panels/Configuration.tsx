import {Col} from "../components/Col.tsx";
import {RuleInstance} from "./RuleInstance.tsx";
import {Row} from "../components/Row.tsx";
import {SortableList} from "../components/SortableList.tsx";
import {removeAt, updateAt} from "../logic/list.ts";
import {Config} from "../models/config.ts";
import {tokiPonaRoot, tokiPonaRules, tokiPonaWeightedRules} from "../logic/defaults.ts";
import {Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions} from "@headlessui/react";
import {FormEvent} from "react";
import {CheckIcon, ChevronsUpDownIcon} from "lucide-react";
import {Rule} from "../models/ui.ts";

type ConfigurationProps = {
    config: Config
    setRules: (root: string | null, rules: Rule[]) => void
    updateConfig: (patch: Partial<Config>) => void
}

export const Configuration = ({config, setRules, updateConfig}: ConfigurationProps) => {

    const onRuleChangeIndex = (index: number) => {
        return (group: Rule) => {
            setRules(config.root, updateAt(config.rules, index, group))
        }
    }

    const onRuleCloneIndex = (index: number) => {
        return () => {
            const source = config.rules[index]
            const rule: Rule = {
                ...source,
                id: crypto.randomUUID(),
                name: `${source.name} clone`,
                patterns: source.patterns.map(p => ({...p, id: crypto.randomUUID()})),
                rewrites: source.rewrites.map(p => ({...p, id: crypto.randomUUID()})),
                exclusions: source.exclusions.map(p => ({...p, id: crypto.randomUUID()})),
            }

            setRules(config.root, [...config.rules.slice(0, index + 1), rule, ...config.rules.slice(index + 1)])
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {

            const deletedRule = config.rules[index].name

            const root = deletedRule == config.root ? null : config.root

            setRules(root, removeAt(config.rules, index))
        }
    }

    const onRuleAdd = () => {
        setRules(config.root, [...config.rules, {
            id: crypto.randomUUID(),
            name: "",
            patterns: [],
            rewrites: [],
            exclusions: [],
            terminalOnly: false,
            showRewrites: false,
            showExclusions: false,
            collapsed: false,
        }])
    }

    const onGroupAdd = () => {
        setRules(config.root, [...config.rules, {
            id: crypto.randomUUID(),
            name: "",
            patterns: [],
            rewrites: [],
            exclusions: [],
            terminalOnly: true,
            showRewrites: false,
            showExclusions: false,
            collapsed: false,
        }])
    }

    const onSelectRoot = (root: string | null) => {
        setRules(root, config.rules)
    }

    const onSetLanguage = (e: FormEvent<HTMLInputElement>) => {
        const lang = e.currentTarget.value;
        updateConfig({language: lang})
    }

    return (

        <Col className="bg-background md:w-2/3 p-6 gap-2 md:overflow-auto md:no-scrollbar">

            <Row className="gap-4">
                <button className="bg-accent-danger rounded-sm p-2 w-1/3"
                        onClick={() => updateConfig({language: "", root: null, rules: []})}>
                    <Row className="items-center justify-center gap-2">
                        <span>Clear</span>
                    </Row>
                </button>
                <button className="bg-accent-danger rounded-sm p-2 w-1/3"
                        onClick={() => updateConfig({
                            language: "toki pona",
                            root: tokiPonaRoot,
                            rules: tokiPonaRules,
                            enableWeights: false
                        })}>
                    <Row className="items-center justify-center gap-2">
                        <span>toki pona example</span>
                    </Row>
                </button>
                <button className="bg-accent-danger rounded-sm p-2 w-1/3"
                        onClick={() => updateConfig({
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
                <label htmlFor="language">Language</label>
                <div className="rounded-sm overflow-clip">
                    <input id="language" value={config.language} onInput={onSetLanguage}
                           className={`bg-surface text-left h-8 outline-0 pl-2 w-72`}/>
                </div>
            </Row>

            <Listbox value={config.root} onChange={onSelectRoot}>
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

                    <SortableList items={config.rules} onChange={rules => setRules(config.root, rules)}
                                  direction="vertical">
                        {config.rules.map((r, index) =>
                            <RuleInstance rule={r}
                                          onRuleChange={onRuleChangeIndex(index)}
                                          onDelete={onRuleDeleteIndex(index)}
                                          enableWeights={config.enableWeights}
                                          enableSerif={config.enableSerif}
                                          key={r.id}
                                          onClone={onRuleCloneIndex(index)}
                            />)}
                    </SortableList>

                    <Row className="gap-4">
                        <button onClick={onGroupAdd} className="grow bg-primary rounded-sm p-1">
                            Add Terminal Rule
                        </button>
                        <button onClick={onRuleAdd} className="grow bg-secondary rounded-sm p-1">
                            Add Rule
                        </button>
                    </Row>
                </Col>

            </Col>

        </Col>
    )
}