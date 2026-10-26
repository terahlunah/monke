import {ChangeEvent, Dispatch} from "react";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {lowerFirst} from "@/components/text.ts";
import {RewritePattern, Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {SortableList, SortableRow} from "@/components/SortableList.tsx";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
import {AddButton, GripButton, RowDeleteButton, SectionLabel} from "./ruleParts.tsx";
import {rowInput, valueFont} from "./ruleStyles.ts";


export type RewriteSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
}

export const RewriteSection = ({rule, dispatch, enableSerif}: RewriteSectionProps) => {

    const ruleId = rule.id

    return (
        <>
            <SectionLabel tone="text-rewrite" count={rule.rewrites.length}>Rewrites</SectionLabel>
            <SortableList items={rule.rewrites} onMove={(from, to) => dispatch({type: "moveRewrite", ruleId, from, to})}
                          direction="vertical"
                          describe={r => `rewrite ${r.match || "empty"} to ${r.replace || "empty"}`}>
                <div role="list" aria-label={`Rewrites of rule ${rule.name}`} className="flex flex-col gap-1.5">
                    {rule.rewrites.map((r, index) =>
                        <RewritePatternItem key={r.id}
                                            label={`Rewrite ${index + 1} of rule ${rule.name}`}
                                            ruleId={ruleId}
                                            rewrite={r}
                                            index={index}
                                            total={rule.rewrites.length}
                                            onMove={to => dispatch({type: "moveRewrite", ruleId, from: index, to})}
                                            onChange={patch => dispatch({type: "editRewrite", ruleId, id: r.id, patch})}
                                            onDelete={() => dispatch({type: "removeRewrite", ruleId, id: r.id})}
                                            enableSerif={enableSerif}/>
                    )}
                </div>
            </SortableList>
            <InlineGrammarError ruleId={ruleId} itemIds={rule.rewrites.map(p => p.id)}/>
            <div>
                <AddButton tone="text-primary-text" label={`Add rewrite to rule ${rule.name}`}
                           onClick={() => dispatch({type: "addRewrite", ruleId})}>
                    Rewrite
                </AddButton>
            </div>
        </>
    );
}


type RewritePatternProps = {
    ruleId: string
    label: string
    index: number
    total: number
    onMove: (to: number) => void
    rewrite: RewritePattern
    onChange: (patch: Partial<RewritePattern>) => void
    onDelete?: () => void
    enableSerif?: boolean
}
export const RewritePatternItem = ({
                                       ruleId,
                                       label,
                                       index,
                                       total,
                                       onMove,
                                       rewrite,
                                       onChange,
                                       onDelete,
                                       enableSerif,
                                   }: RewritePatternProps) => {

    const invalid = useInvalidProps(ruleId, rewrite.id)
    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => onChange({match: e.target.value})
    const onReplaceInput = (e: ChangeEvent<HTMLInputElement>) => onChange({replace: e.target.value})
    const input = `${rowInput} ${valueFont(enableSerif)}`

    return (
        <SortableRow id={rewrite.id} role="listitem" className="group/row" draggingClassName="relative z-30 bg-surface shadow-lg">
            {({handleProps}) => (
                <div className="grid grid-cols-[18px_minmax(0,1fr)_16px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,1fr)_20px_minmax(0,1fr)_auto] items-center gap-x-1.5 md:gap-x-2.5">
                    <GripButton label={`Drag ${lowerFirst(label)}`} handleProps={handleProps}/>
                    <input type="text" value={rewrite.match} aria-label={`${label}, match`} {...invalid}
                           onChange={onMatchInput} spellCheck={false} className={input}/>
                    <span className="text-center text-muted" aria-hidden="true">→</span>
                    <input type="text" value={rewrite.replace} aria-label={`${label}, replacement`} {...invalid}
                           onChange={onReplaceInput} spellCheck={false} className={input}/>
                    <div className="flex items-center">
                        <MoveButtons label={lowerFirst(label)} index={index} total={total} onMove={onMove} orientation="vertical" scope="row"
                                     buttonClassName="flex size-9 md:size-[30px] items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                                     iconClassName="size-4"/>
                        <RowDeleteButton label={`Delete ${lowerFirst(label)}`} onClick={onDelete}/>
                    </div>
                </div>
            )}
        </SortableRow>
    );
}
