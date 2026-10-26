import {ChangeEvent, Dispatch} from "react";
import {Row} from "@/components/Row.tsx";
import {ChevronsRightIcon, EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
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
                <div>Rewrites</div>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <Row className="gap-4 flex-wrap">
                <SortableList items={rule.rewrites} onMove={(from, to) => dispatch({type: "moveRewrite", ruleId, from, to})}
                              direction="horizontal">
                    {rule.rewrites.map((r, index) =>
                        <RewritePatternItem key={r.id}
                                            label={`Rewrite ${index + 1} of rule ${rule.name}`}
                                            rewrite={r}
                                            onChange={patch => dispatch({type: "editRewrite", ruleId, id: r.id, patch})}
                                            onDelete={() => dispatch({type: "removeRewrite", ruleId, id: r.id})}
                                            enableSerif={enableSerif}/>
                    )}
                </SortableList>

                <button onClick={() => dispatch({type: "addRewrite", ruleId})}
                        className={`bg-accent-warning  mr-4 rounded-sm p-1`}
                        aria-label="Add rewrite pattern">
                    <PlusIcon className="size-6"/>
                </button>
            </Row>
        </>
    );
}


type RewritePatternProps = {
    label: string
    rewrite: RewritePattern
    onChange: (patch: Partial<RewritePattern>) => void
    onDelete?: () => void
    enableSerif?: boolean
}
export const RewritePatternItem = ({
                                       label,
                                       rewrite,
                                       onChange,
                                       onDelete,
                                       enableSerif,
                                   }: RewritePatternProps) => {

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
                    <button className={`bg-accent-warning p-1 h-8`} {...handleProps} aria-label="Drag rewrite pattern">
                        <EllipsisVerticalIcon className="size-4"/>
                    </button>
                    <AutowidthInput value={rewrite.match}
                                    aria-label={`${label}, match`}
                                    onChange={onMatchInput}
                                    className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <span className="bg-accent-warning p-1 h-8 flex items-center" aria-hidden="true">
                        <ChevronsRightIcon className="size-4"/>
                    </span>
                    <AutowidthInput value={rewrite.replace}
                                    aria-label={`${label}, replacement`}
                                    onChange={onReplaceInput}
                                    className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"
                            aria-label="Delete rewrite pattern"><XIcon className="size-4"/></button>
                </Row>
            )}
        </SortableRow>
    );
}
