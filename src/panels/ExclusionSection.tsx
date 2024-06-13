import {GenericProps} from "../components/GenericProps.tsx";
import {arrayMove, horizontalListSortingStrategy, SortableContext, useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {ChangeEvent} from "react";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, PlusIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors} from "@dnd-kit/core";
import cloneDeep from "lodash.clonedeep";
import {uid} from "uid";
import {ExclusionPattern, Rule} from "../models/ui.ts";


export type ExclusionSectionProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    enableSerif?: boolean
}

export const ExclusionSection = ({rule, onRuleChange, enableSerif,}: GenericProps<ExclusionSectionProps>) => {

    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }), useSensor(MouseSensor)
    );

    const onExclusionPatternChangeIndex = (index: number) => {
        return (pattern: ExclusionPattern) => {
            const newRule = cloneDeep(rule)
            newRule.exclusions[index] = pattern
            onRuleChange(newRule)
        }
    }

    const onExclusionPatternDeleteIndex = (index: number) => {
        return () => {
            const newRule = cloneDeep(rule)
            newRule.exclusions.splice(index, 1)
            onRuleChange(newRule)
        }
    }

    const onExclusionPatternAdd = () => {
        const newRule = cloneDeep(rule)
        newRule.exclusions.push({id: uid(), match: ""})
        onRuleChange(newRule)
    }

    const onExclusionPatternDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (active.id !== over?.id) {

            const oldIndex = rule.exclusions.findIndex(it => it.id === active.id);
            const newIndex = rule.exclusions.findIndex(it => it.id === over?.id);

            const newRule = cloneDeep(rule)
            newRule.exclusions = arrayMove(newRule.exclusions, oldIndex, newIndex)
            onRuleChange(newRule)
        }
    };

    return (
        <>
            <Row className="items-baseline justify-between gap-4">
                <div>Exclusions</div>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <Row className="gap-4 flex-wrap">
                <DndContext sensors={sensors} collisionDetection={closestCenter}
                            onDragEnd={onExclusionPatternDragEnd}>
                    <SortableContext items={rule.exclusions} strategy={horizontalListSortingStrategy}>
                        {rule.exclusions.map((e, index) =>
                            <ExclusionPatternItem exclusion={e}
                                                  onChange={onExclusionPatternChangeIndex(index)}
                                                  onDelete={onExclusionPatternDeleteIndex(index)}
                                                  enableSerif={enableSerif}/>
                        )}
                    </SortableContext>
                </DndContext>

                <button onClick={onExclusionPatternAdd}
                        className={`bg-accent-caution  mr-4 rounded p-1`}
                        aria-label="Add exclusion pattern">
                    <PlusIcon className="h-6"/>
                </button>
            </Row>
        </>
    );
}


export type ExclusionPatternProps = {
    exclusion: ExclusionPattern
    onChange: (value: ExclusionPattern) => void
    onDelete?: () => void
    enableSerif?: boolean
}

export const ExclusionPatternItem = ({
                                         className,
                                         exclusion,
                                         onChange,
                                         onDelete,
                                         enableSerif,
                                     }: GenericProps<ExclusionPatternProps>) => {

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: exclusion.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...exclusion, match: v})
    }

    return (
        <div ref={setNodeRef} style={style} key={exclusion.id} id={exclusion.id}>
            <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
                <button className={`bg-accent-caution p-1 h-8`} {...listeners} aria-label="Drag exclusion pattern">
                    <EllipsisVerticalIcon className="h-4"/>
                </button>
                <AutowidthInput value={exclusion.match}
                                onChange={onGroupInput}
                                className={`bg-accent-caution/20 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"
                        aria-label="Delete exclusion pattern"><XMarkIcon className="h-4"/></button>
            </Row>
        </div>
    );
}