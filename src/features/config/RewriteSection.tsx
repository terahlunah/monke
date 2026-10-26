import {ChangeEvent, Dispatch} from "react";
import {Row} from "@/components/Row.tsx";
import {ChevronsRightIcon, EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import {useInvalidProps} from "./grammarError.ts";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {lowerFirst} from "@/components/text.ts";
import AutowidthInput from "react-autowidth-input";
import {RewritePattern, Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {SortableList, SortableRow} from "@/components/SortableList.tsx";


export type RewriteSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
}

export const RewriteSection = ({rule, dispatch, enableSerif}: RewriteSectionProps) => {

    const ruleId = rule.id

    return (
        <>
            <Row className="items-baseline justify-between gap-4">
                <h4>Rewrites</h4>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <Row className="gap-4 flex-wrap">
                <SortableList items={rule.rewrites} onMove={(from, to) => dispatch({type: "moveRewrite", ruleId, from, to})}
                              direction="horizontal"
                              describe={r => `rewrite ${r.match || "empty"} to ${r.replace || "empty"}`}>
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
                </SortableList>

                <button onClick={() => dispatch({type: "addRewrite", ruleId})}
                        className={`bg-accent-warning  mr-4 rounded-sm p-1`}
                        aria-label={`Add rewrite to rule ${rule.name}`}>
                    <PlusIcon className="size-6"/>
                </button>
            </Row>
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
    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({match: v})
    }
    const onReplaceInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({replace: v})
    }

    return (
        <SortableRow id={rewrite.id}>
            {({handleProps}) => (
                <Row className="rounded-sm overflow-clip w-min h-8 items-center">
                    <button className={`bg-accent-warning p-1 h-8`} {...handleProps} aria-label={`Drag ${lowerFirst(label)}`}>
                        <EllipsisVerticalIcon className="size-4"/>
                    </button>
                    <MoveButtons label={lowerFirst(label)} index={index} total={total} onMove={onMove}
                                 buttonClassName="bg-accent-warning/70 p-1 h-8 disabled:opacity-40"
                                 iconClassName="size-4"/>
                    <AutowidthInput value={rewrite.match}
                                    aria-label={`${label}, match`} {...invalid}
                                    onChange={onMatchInput}
                                    className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <span className="bg-accent-warning p-1 h-8 flex items-center" aria-hidden="true">
                        <ChevronsRightIcon className="size-4"/>
                    </span>
                    <AutowidthInput value={rewrite.replace}
                                    aria-label={`${label}, replacement`} {...invalid}
                                    onChange={onReplaceInput}
                                    className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"
                            aria-label={`Delete ${lowerFirst(label)}`}><XIcon className="size-4"/></button>
                </Row>
            )}
        </SortableRow>
    );
}
