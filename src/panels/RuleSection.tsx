import {Dispatch, FormEvent, useState} from "react";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {Rule, RulePattern} from "../engine/config.ts";
import {ConfigAction} from "../engine/configReducer.ts";
import {SortableList, SortableRow} from "../components/SortableList.tsx";


export type RuleSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
    enableWeights?: boolean
}

export const RuleSection = ({rule, dispatch, enableSerif, enableWeights}: RuleSectionProps) => {

    const ruleId = rule.id

    return (
        <Row className="gap-4 flex-wrap">
            <SortableList items={rule.patterns} onMove={(from, to) => dispatch({type: "movePattern", ruleId, from, to})}
                          direction="horizontal">
                {rule.patterns.map(p =>
                    <RulePatternItem key={p.id}
                                     pattern={p}
                                     onChange={patch => dispatch({type: "editPattern", ruleId, id: p.id, patch})}
                                     terminalOnly={rule.terminalOnly}
                                     onDelete={() => dispatch({type: "removePattern", ruleId, id: p.id})}
                                     enableWeight={enableWeights}
                                     enableSerif={enableSerif}/>
                )}
            </SortableList>
            <button onClick={() => dispatch({type: "addPattern", ruleId})}
                    className={`${rule.terminalOnly ? "bg-primary" : "bg-secondary"}  mr-4 rounded-sm p-1`}
                    aria-label="Add pattern">
                <PlusIcon className="size-6"/>
            </button>
        </Row>
    );
}


type RulePatternProps = {
    pattern: RulePattern
    onChange: (patch: Partial<RulePattern>) => void
    terminalOnly: boolean
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
}

function isNumber(value?: string | number): boolean {
    return ((value != null) &&
        (value !== '') &&
        !isNaN(Number(value.toString())));
}

export const RulePatternItem = ({
                                    pattern,
                                    onChange,
                                    terminalOnly,
                                    onDelete,
                                    enableWeight,
                                    enableSerif,
                                }: RulePatternProps) => {

    const [weightValue, setWeightValue] = useState(pattern.weight.toString())

    // Resync the text field when the pattern changes, during render rather than in an effect to avoid a cascading render.
    const [syncedPattern, setSyncedPattern] = useState(pattern)
    if (syncedPattern !== pattern) {
        setSyncedPattern(pattern)
        setWeightValue(pattern.weight.toString())
    }

    const onGroupInput = (e: FormEvent<HTMLInputElement>) => {
        const v = e.currentTarget.value
        onChange({pattern: v})
    }

    const onWeightInput = (e: FormEvent<HTMLInputElement>) => {
        const v = e.currentTarget.value
        setWeightValue(v)
    }

    const onWeightBlur = () => {
        if (isNumber(weightValue)) {
            onChange({weight: +weightValue})
        } else {
            setWeightValue('1')
        }
    }

    return (
        <SortableRow id={pattern.id}>
            {({handleProps}) => (
                <Row className="rounded-sm overflow-clip w-min h-8 items-center">
                    <button className={`${terminalOnly ? "bg-primary" : "bg-secondary"} p-1 h-8`} {...handleProps}
                            aria-label="Drag pattern">
                        <EllipsisVerticalIcon className="size-4"/>
                    </button>
                    <AutowidthInput value={pattern.pattern}
                                    onChange={onGroupInput}
                                    className={`${terminalOnly ? "bg-primary/40" : "bg-secondary/40"} px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    {enableWeight ? (
                        <AutowidthInput value={weightValue}
                                        onInput={onWeightInput}
                                        onBlur={onWeightBlur}
                                        className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                                        type="text"
                                        minWidth={10}/>
                    ) : null
                    }
                    <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8" aria-label="Delete pattern">
                        <XIcon className="size-4"/></button>
                </Row>
            )}
        </SortableRow>
    );
}
