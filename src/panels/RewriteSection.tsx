import {ChangeEvent} from "react";
import {Row} from "../components/Row.tsx";
import {ChevronsRightIcon, EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {RewritePattern, Rule} from "../models/ui.ts";
import {SortableList, SortableRow} from "../components/SortableList.tsx";
import {removeAt, updateAt} from "../logic/list.ts";


export type RewriteSectionProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    enableSerif?: boolean
}

export const RewriteSection = ({rule, onRuleChange, enableSerif}: RewriteSectionProps) => {

    const setRewrites = (rewrites: RewritePattern[]) => onRuleChange({...rule, rewrites})

    const onAdd = () => {
        setRewrites([...rule.rewrites, {id: crypto.randomUUID(), match: "", replace: ""}])
    }

    return (
        <>
            <Row className="items-baseline justify-between gap-4">
                <div>Rewrites</div>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <Row className="gap-4 flex-wrap">
                <SortableList items={rule.rewrites} onChange={setRewrites} direction="horizontal">
                    {rule.rewrites.map((r, index) =>
                        <RewritePatternItem key={r.id}
                                            rewrite={r}
                                            onChange={rewrite => setRewrites(updateAt(rule.rewrites, index, rewrite))}
                                            onDelete={() => setRewrites(removeAt(rule.rewrites, index))}
                                            enableSerif={enableSerif}/>
                    )}
                </SortableList>

                <button onClick={onAdd}
                        className={`bg-accent-warning  mr-4 rounded-sm p-1`}
                        aria-label="Add rewrite pattern">
                    <PlusIcon className="size-6"/>
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
export const RewritePatternItem = ({
                                       rewrite,
                                       onChange,
                                       onDelete,
                                       enableSerif,
                                   }: RewritePatternProps) => {

    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, match: v})
    }
    const onReplaceInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, replace: v})
    }

    return (
        <SortableRow id={rewrite.id}>
            {({handleProps}) => (
                <Row className="rounded-sm overflow-clip w-min h-8 items-center">
                    <button className={`bg-accent-warning p-1 h-8`} {...handleProps} aria-label="Drag rewrite pattern">
                        <EllipsisVerticalIcon className="size-4"/>
                    </button>
                    <AutowidthInput value={rewrite.match}
                                    onChange={onMatchInput}
                                    className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <button className="bg-accent-warning p-1 h-8" aria-disabled={true} disabled={true} aria-label="">
                        <ChevronsRightIcon className="size-4"/>
                    </button>
                    <AutowidthInput value={rewrite.replace}
                                    onChange={onReplaceInput}
                                    className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"><XIcon className="size-4"/>
                    </button>
                </Row>
            )}
        </SortableRow>
    );
}
