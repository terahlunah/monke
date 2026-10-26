import {FormEvent, useState} from "react";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {Rule, RulePattern} from "../models/ui.ts";
import {SortableList, SortableRow} from "../components/SortableList.tsx";
import {removeAt, updateAt} from "../logic/list.ts";


export type RuleSectionProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    enableSerif?: boolean
    enableWeights?: boolean
}

export const RuleSection = ({rule, onRuleChange, enableSerif, enableWeights}: RuleSectionProps) => {

    const setPatterns = (patterns: RulePattern[]) => onRuleChange({...rule, patterns})

    const onAdd = () => {
        setPatterns([...rule.patterns, {id: crypto.randomUUID(), pattern: "", weight: 1.0}])
    }

    return (
        <Row className="gap-4 flex-wrap">
            <SortableList items={rule.patterns} onChange={setPatterns} direction="horizontal">
                {rule.patterns.map((p, index) =>
                    <RulePatternItem key={p.id}
                                     pattern={p}
                                     onChange={pattern => setPatterns(updateAt(rule.patterns, index, pattern))}
                                     terminalOnly={rule.terminalOnly}
                                     onDelete={() => setPatterns(removeAt(rule.patterns, index))}
                                     enableWeight={enableWeights}
                                     enableSerif={enableSerif}/>
                )}
            </SortableList>
            <button onClick={onAdd}
                    className={`${rule.terminalOnly ? "bg-primary" : "bg-secondary"}  mr-4 rounded-sm p-1`}
                    aria-label="Add pattern">
                <PlusIcon className="size-6"/>
            </button>
        </Row>
    );
}


type RulePatternProps = {
    pattern: RulePattern
    onChange: (value: RulePattern) => void
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
        onChange({...pattern, pattern: v})
    }

    const onWeightInput = (e: FormEvent<HTMLInputElement>) => {
        const v = e.currentTarget.value
        setWeightValue(v)
    }

    const onWeightBlur = () => {
        if (isNumber(weightValue)) {
            onChange({...pattern, weight: +weightValue})
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
