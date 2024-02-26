import {GenericProps} from "../components/GenericProps.tsx";
import {arrayMove, horizontalListSortingStrategy, SortableContext, useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {ChangeEvent} from "react";
import {Row} from "../components/Row.tsx";
import {ChevronDoubleRightIcon, EllipsisVerticalIcon, PlusIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {Rule} from "./RuleInstance.tsx";
import {closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import cloneDeep from "lodash.clonedeep";
import {uid} from "uid";

export type RewritePattern = {
    id: string
    match: string,
    replace: string
}


export type RewriteSectionProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    enableSerif?: boolean
}

export const RewriteSection = ({rule, onRuleChange, enableSerif,}: GenericProps<RewriteSectionProps>) => {

    const sensors = useSensors(
        useSensor(PointerSensor),
    );

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

    return (
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
    );
}


type RewritePatternProps = {
    rewrite: RewritePattern
    onChange: (rewrite: RewritePattern) => void
    onDelete?: () => void
    enableSerif?: boolean
}
export const RewritePattern = ({
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