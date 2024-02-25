import {GenericProps} from "./GenericProps.tsx";
import {Row} from "./Row.tsx";
import {ChevronDoubleRightIcon, EllipsisVerticalIcon, PlusIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent, useEffect, useState} from "react";
import {Col} from "./Col.tsx";
import cloneDeep from "lodash.clonedeep"
import {uid} from "uid";
import {ToggleLabel} from "./ToggleLabel.tsx";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    arrayMove,
    horizontalListSortingStrategy,
    SortableContext,
    useSortable
} from "@dnd-kit/sortable";
import {CSS} from '@dnd-kit/utilities';

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

type RulePattern = {
    id: string
    pattern: string
    weight: number
}

type RewritePattern = {
    id: string
    match: string,
    replace: string
}


type ExclusionPattern = {
    id: string
    match: string,
}

type RulesProps = {
    rules: Rule[]
    onRulesChange: (groups: Rule[]) => void
    enableWeight?: boolean
    enableSerif?: boolean
}

export const Rules = (
    {
        className,
        rules,
        onRulesChange,
        enableWeight,
        enableSerif,
    }: GenericProps<RulesProps>) => {

    const onRuleChangeIndex = (index: number) => {
        return (group: Rule) => {
            const newRules = cloneDeep(rules)
            newRules[index] = group
            onRulesChange(newRules)
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {
            const newRules = cloneDeep(rules)
            newRules.splice(index, 1)
            onRulesChange(newRules)
        }
    }

    const onRuleAdd = () => {
        onRulesChange([...rules, {
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
        onRulesChange([...rules, {
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


    return (
        <Col className={`${className}`}>
            {/*<Row className="items-center gap-4">*/}
            {/*    <h1 className="pb-4 text-3xl">Rules</h1>*/}
            {/*    <hr className="grow h-0.5 border-t-0 bg-secondary"/>*/}
            {/*</Row>*/}
            <Col className="gap-4">
                {rules.map((r, index) =>
                    <RuleItem rule={r}
                              onRuleChange={onRuleChangeIndex(index)}
                              onDelete={onRuleDeleteIndex(index)}
                              enableWeight={enableWeight}
                              enableSerif={enableSerif}/>)}
                <Row className="gap-4">
                    <button onClick={onGroupAdd} className="grow bg-primary rounded p-1">Add Group</button>
                    <button onClick={onRuleAdd} className="grow bg-secondary rounded p-1">Add Rule</button>
                </Row>
            </Col>

        </Col>
    )
}

type RuleItemProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
}

const RuleItem = ({
                      className,
                      rule,
                      onRuleChange,
                      onDelete,
                      enableWeight,
                      enableSerif,
                  }: GenericProps<RuleItemProps>) => {


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

    return (
        <Col className={`${className} rounded bg-surface p-2 gap-2`}>
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
                                    <ToggleLabel label="Rw" checked={rule.showRewrites} onChange={onRuleToggleRewrites}
                                                 enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/20"/>
                                    <ToggleLabel label="Ex" checked={rule.showExclusions}
                                                 onChange={onRuleToggleExclusions}
                                                 enabledColor="bg-accent-caution" disabledColor="bg-accent-caution/20"/>
                                </Row>
                            </>
                            : null
                    }

                </Row>
                <button onClick={onDelete} className="bg-accent-danger/50 rounded p-1">
                    <XMarkIcon className="h-5"/>
                </button>
            </Row>
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
    )
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

const RulePattern = ({
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

    useEffect(() => {
        setWeightValue(pattern.weight.toString())
    }, [pattern]);

    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...pattern, pattern: v})
    }

    const onWeightInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
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
        <div ref={setNodeRef} style={style} key={pattern.id} id={pattern.id}>
            <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
                <button className={`${terminalOnly ? "bg-primary" : "bg-secondary"} p-1 h-8`} {...listeners}>
                    <EllipsisVerticalIcon className="h-4"/>
                </button>
                <AutowidthInput value={pattern.pattern}
                                onChange={onGroupInput}
                                className={`${terminalOnly ? "bg-primary/40" : "bg-secondary/40"} px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                {enableWeight ? (
                    <>
                        {/*<button className="bg-accent-warning p-1 h-8"><ArrowsUpDownIcon className="h-4"/></button>*/}
                        {/*<button className="bg-accent-warning p-1 h-8">%</button>*/}
                        <AutowidthInput value={weightValue}
                                        onInput={onWeightInput}
                                        onBlur={onWeightBlur}
                                        className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                                        type="text"
                                        minWidth={10}/>
                    </>
                ) : null
                }
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/></button>
            </Row>
        </div>
    );
}

type RewritePatternProps = {
    rewrite: RewritePattern
    onChange: (rewrite: RewritePattern) => void
    onDelete?: () => void
    enableSerif?: boolean
}

const RewritePattern = ({
                            className,
                            rewrite,
                            onChange,
                            onDelete,
                            enableSerif,
                        }: GenericProps<RewritePatternProps>) => {

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: rewrite.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, match: v})
    }
    const onReplaceInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, replace: v})
    }


    return (
        <div ref={setNodeRef} style={style} key={rewrite.id} id={rewrite.id}>
            <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
                <button className={`bg-accent-warning p-1 h-8`} {...listeners}>
                    <EllipsisVerticalIcon className="h-4"/>
                </button>
                <AutowidthInput value={rewrite.match}
                                onChange={onMatchInput}
                                className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button className="bg-accent-warning p-1 h-8"><ChevronDoubleRightIcon className="h-4"/></button>
                <AutowidthInput value={rewrite.replace}
                                onChange={onReplaceInput}
                                className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/></button>
            </Row>
        </div>
    );
}

type ExclusionPatternProps = {
    exclusion: ExclusionPattern
    onChange: (value: ExclusionPattern) => void
    onDelete?: () => void
    enableSerif?: boolean
}

const ExclusionPattern = ({
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
                <button className={`bg-accent-caution p-1 h-8`} {...listeners}>
                    <EllipsisVerticalIcon className="h-4"/>
                </button>
                <AutowidthInput value={exclusion.match}
                                onChange={onGroupInput}
                                className={`bg-accent-caution/20 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/></button>
            </Row>
        </div>
    );
}