import {GenericProps} from "../components/GenericProps.tsx";
import {Row} from "../components/Row.tsx";
import {PlusIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent} from "react";
import {Col} from "../components/Col.tsx";
import cloneDeep from "lodash.clonedeep"
import {uid} from "uid";
import {ToggleLabel} from "../components/ToggleLabel.tsx";
import {closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import {arrayMove, horizontalListSortingStrategy, SortableContext, useSortable} from "@dnd-kit/sortable";
import {ExclusionPattern} from "./ExclusionSection.tsx";
import {RewritePattern} from "./RewriteSection.tsx";
import {RulePattern} from "./RuleSection.tsx";
import {CSS} from "@dnd-kit/utilities";

export type Rule = {
    id: string
    name: string
    patterns: RulePattern[]
    rewrites: RewritePattern[]
    exclusions: ExclusionPattern[]
    terminalOnly: boolean
    showRewrites: boolean
    showExclusions: boolean
}

export type RuleInstanceProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
}

export const RuleInstance = ({
                                 className,
                                 rule,
                                 onRuleChange,
                                 onDelete,
                                 enableWeight,
                                 enableSerif,
                             }: GenericProps<RuleInstanceProps>) => {


    const onRuleNameInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onRuleChange({...rule, name: v});
    }

    const onRuleToggleRewrites = (showRewrites: boolean) => {
        onRuleChange({...rule, showRewrites: showRewrites});
    }
    const onRuleToggleExclusions = (showExclusions: boolean) => {
        onRuleChange({...rule, showExclusions: showExclusions});
    }

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
        newRule.patterns.push({id: uid(), pattern: "", weight: 1.0})
        onRuleChange(newRule)
    }

    const onRewritePatternChangeIndex = (index: number) => {
        return (pattern: RewritePattern) => {
            const newRule = cloneDeep(rule)
            newRule.rewrites[index] = pattern
            onRuleChange(newRule)
        }
    }

    const onRewritePatternDeleteIndex = (index: number) => {
        return () => {
            const newRule = cloneDeep(rule)
            newRule.rewrites.splice(index, 1)
            onRuleChange(newRule)
        }
    }

    const onRewritePatternAdd = () => {
        const newRule = cloneDeep(rule)
        newRule.rewrites.push({id: uid(), match: "", replace: ""})
        onRuleChange(newRule)
    }

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

    const sensors = useSensors(
        useSensor(PointerSensor),
    );

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

    const onRewritePatternDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (active.id !== over?.id) {

            const oldIndex = rule.rewrites.findIndex(it => it.id === active.id);
            const newIndex = rule.rewrites.findIndex(it => it.id === over?.id);

            const newRule = cloneDeep(rule)
            newRule.rewrites = arrayMove(newRule.rewrites, oldIndex, newIndex)
            onRuleChange(newRule)
        }
    };

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

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: rule.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} key={rule.id} id={rule.id}>
            <Col className={`${className} rounded bg-surface p-2 gap-2`}>
                <div {...listeners}>
                    <Row className="items-center justify-between">
                        <Row className="gap-4 items-center">
                            <div className="rounded overflow-clip">
                                <AutowidthInput value={rule.name} onInput={onRuleNameInput}
                                                className={`${rule.terminalOnly ? "bg-primary/40" : "bg-secondary/40"} text-center h-10 outline-0 px-4 text-lg`}/>
                            </div>
                            {
                                !rule.terminalOnly ?
                                    <>
                                        <div className="w-0.5 h-8 bg-white/10"/>
                                        <Row className="gap-2 items-center">
                                            <ToggleLabel label="Rw" checked={rule.showRewrites}
                                                         onChange={onRuleToggleRewrites}
                                                         enabledColor="bg-accent-warning"
                                                         disabledColor="bg-accent-warning/20"/>
                                            <ToggleLabel label="Ex" checked={rule.showExclusions}
                                                         onChange={onRuleToggleExclusions}
                                                         enabledColor="bg-accent-caution"
                                                         disabledColor="bg-accent-caution/20"/>
                                        </Row>
                                    </>
                                    : null
                            }

                        </Row>
                        <button onClick={onDelete} className="bg-accent-danger/50 rounded p-1">
                            <XMarkIcon className="h-5"/>
                        </button>
                    </Row>
                </div>
                <Row className="items-baseline justify-between gap-4">
                    <div>Patterns</div>
                    <div className="h-0.5 bg-white/10 grow"/>
                </Row>
                <Row className="gap-4 flex-wrap">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRulePatternDragEnd}>
                        <SortableContext items={rule.patterns} strategy={horizontalListSortingStrategy}>
                            {rule.patterns.map((p, index) =>
                                <RulePattern pattern={p}
                                             onChange={onRuleChangeIndex(index)}
                                             terminalOnly={rule.terminalOnly}
                                             onDelete={onRuleDeleteIndex(index)}
                                             enableWeight={enableWeight}
                                             enableSerif={enableSerif}/>
                            )}
                        </SortableContext>
                    </DndContext>
                    <button onClick={onRuleAdd}
                            className={`${rule.terminalOnly ? "bg-primary" : "bg-secondary"}  mr-4 rounded p-1`}>
                        <PlusIcon className="h-6"/>
                    </button>
                </Row>
                {rule.showRewrites && !rule.terminalOnly ? (
                    <>
                        <Row className="items-baseline justify-between gap-4">
                            <div>Rewrites</div>
                            <div className="h-0.5 bg-white/10 grow"/>
                        </Row>
                        <Row className="gap-4 flex-wrap">
                            <DndContext sensors={sensors} collisionDetection={closestCenter}
                                        onDragEnd={onRewritePatternDragEnd}>
                                <SortableContext items={rule.rewrites} strategy={horizontalListSortingStrategy}>
                                    {rule.rewrites.map((r, index) =>
                                        <RewritePattern rewrite={r}
                                                        onChange={onRewritePatternChangeIndex(index)}
                                                        onDelete={onRewritePatternDeleteIndex(index)}
                                                        enableSerif={enableSerif}/>
                                    )}
                                </SortableContext>
                            </DndContext>

                            <button onClick={onRewritePatternAdd}
                                    className={`bg-accent-warning  mr-4 rounded p-1`}>
                                <PlusIcon className="h-6"/>
                            </button>
                        </Row>
                    </>
                ) : null
                }
                {rule.showExclusions && !rule.terminalOnly ? (
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
                                        <ExclusionPattern exclusion={e}
                                                          onChange={onExclusionPatternChangeIndex(index)}
                                                          onDelete={onExclusionPatternDeleteIndex(index)}
                                                          enableSerif={enableSerif}/>
                                    )}
                                </SortableContext>
                            </DndContext>

                            <button onClick={onExclusionPatternAdd}
                                    className={`bg-accent-caution  mr-4 rounded p-1`}>
                                <PlusIcon className="h-6"/>
                            </button>
                        </Row>
                    </>
                ) : null
                }
            </Col>
        </div>
    )
}

