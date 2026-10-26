import {GenericProps} from "../components/GenericProps.tsx";
import {FormEvent, useState} from "react";
import {arrayMove, horizontalListSortingStrategy, SortableContext, useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors} from "@dnd-kit/core";
import cloneDeep from "lodash.clonedeep";
import {Rule, RulePattern} from "../models/ui.ts";


export type RuleSectionProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    enableSerif?: boolean
    enableWeights?: boolean
}

export const RuleSection = ({rule, onRuleChange, enableSerif, enableWeights}: GenericProps<RuleSectionProps>) => {

    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }), useSensor(MouseSensor)
    );

    const onRuleChangeIndex = (index: number) => {
        return (pattern: RulePattern) => {
            const newRule = cloneDeep(rule)
            newRule.patterns[index] = pattern
            onRuleChange(newRule)
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {
            const newRule = cloneDeep(rule)
            newRule.patterns.splice(index, 1)
            onRuleChange(newRule)
        }
    }

    const onRuleAdd = () => {
        const newRule = cloneDeep(rule)
        newRule.patterns.push({id: crypto.randomUUID(), pattern: "", weight: 1.0})
        onRuleChange(newRule)
    }

    const onRulePatternDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (active.id !== over?.id) {

            const oldIndex = rule.patterns.findIndex(it => it.id === active.id);
            const newIndex = rule.patterns.findIndex(it => it.id === over?.id);

            const newRule = cloneDeep(rule)
            newRule.patterns = arrayMove(newRule.patterns, oldIndex, newIndex)
            onRuleChange(newRule)
        }
    };

    return (
        <Row className="gap-4 flex-wrap">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRulePatternDragEnd}>
                <SortableContext items={rule.patterns} strategy={horizontalListSortingStrategy}>
                    {rule.patterns.map((p, index) =>
                        <RulePatternItem key={p.id} pattern={p}
                                         onChange={onRuleChangeIndex(index)}
                                         terminalOnly={rule.terminalOnly}
                                         onDelete={onRuleDeleteIndex(index)}
                                         enableWeight={enableWeights}
                                         enableSerif={enableSerif}/>
                    )}
                </SortableContext>
            </DndContext>
            <button onClick={onRuleAdd}
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
                                    className,
                                    pattern,
                                    onChange,
                                    terminalOnly,
                                    onDelete,
                                    enableWeight,
                                    enableSerif,
                                }: GenericProps<RulePatternProps>) => {

    const [weightValue, setWeightValue] = useState(pattern.weight.toString())

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: pattern.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

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
        <div ref={setNodeRef} style={style} id={pattern.id}>
            <Row className={`${className} rounded-sm overflow-clip w-min h-8 items-center`}>
                <button className={`${terminalOnly ? "bg-primary" : "bg-secondary"} p-1 h-8`} {...listeners}
                        aria-label="Drag pattern">
                    <EllipsisVerticalIcon className="size-4"/>
                </button>
                <AutowidthInput value={pattern.pattern}
                                onChange={onGroupInput}
                                className={`${terminalOnly ? "bg-primary/40" : "bg-secondary/40"} px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                {enableWeight ? (
                    <>
                        <AutowidthInput value={weightValue}
                                        onInput={onWeightInput}
                                        onBlur={onWeightBlur}
                                        className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                                        type="text"
                                        minWidth={10}/>
                    </>
                ) : null
                }
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8" aria-label="Delete pattern">
                    <XIcon className="size-4"/></button>
            </Row>
        </div>
    );
}