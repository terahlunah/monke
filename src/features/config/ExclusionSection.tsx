import {ChangeEvent, Dispatch} from "react";
import {Row} from "@/components/Row.tsx";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import {useInvalidProps} from "./grammarError.ts";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {lowerFirst} from "@/components/text.ts";
import AutowidthInput from "react-autowidth-input";
import {ExclusionPattern, Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {SortableList, SortableRow} from "@/components/SortableList.tsx";
import {InlineGrammarError} from "./InlineGrammarError.tsx";


export type ExclusionSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
}

export const ExclusionSection = ({rule, dispatch, enableSerif}: ExclusionSectionProps) => {

    const ruleId = rule.id

    return (
        <>
            <Row className="items-baseline justify-between gap-4">
                <h4>Exclusions</h4>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <Row className="gap-4 flex-wrap">
                <SortableList items={rule.exclusions} onMove={(from, to) => dispatch({type: "moveExclusion", ruleId, from, to})}
                              direction="horizontal"
                              describe={e => e.match ? `exclusion ${e.match}` : "empty exclusion"}>
                    {rule.exclusions.map((e, index) =>
                        <ExclusionPatternItem key={e.id}
                                              label={`Exclusion ${index + 1} of rule ${rule.name}`}
                                              ruleId={ruleId}
                                              exclusion={e}
                                              index={index}
                                              total={rule.exclusions.length}
                                              onMove={to => dispatch({type: "moveExclusion", ruleId, from: index, to})}
                                              onChange={patch => dispatch({type: "editExclusion", ruleId, id: e.id, patch})}
                                              onDelete={() => dispatch({type: "removeExclusion", ruleId, id: e.id})}
                                              enableSerif={enableSerif}/>
                    )}
                </SortableList>

                <button onClick={() => dispatch({type: "addExclusion", ruleId})}
                        className={`bg-accent-caution  mr-4 rounded-sm p-1`}
                        aria-label={`Add exclusion to rule ${rule.name}`}>
                    <PlusIcon className="size-6"/>
                </button>
            </Row>
            <InlineGrammarError ruleId={ruleId} itemIds={rule.exclusions.map(p => p.id)}/>
        </>
    );
}


export type ExclusionPatternProps = {
    ruleId: string
    label: string
    index: number
    total: number
    onMove: (to: number) => void
    exclusion: ExclusionPattern
    onChange: (patch: Partial<ExclusionPattern>) => void
    onDelete?: () => void
    enableSerif?: boolean
}

export const ExclusionPatternItem = ({
                                         ruleId,
                                         label,
                                         index,
                                         total,
                                         onMove,
                                         exclusion,
                                         onChange,
                                         onDelete,
                                         enableSerif,
                                     }: ExclusionPatternProps) => {

    const invalid = useInvalidProps(ruleId, exclusion.id)
    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({match: v})
    }

    return (
        <SortableRow id={exclusion.id}>
            {({handleProps}) => (
                <Row className="group/chip rounded-sm overflow-clip w-min h-8 items-center">
                    <button className={`bg-accent-caution p-1 h-8`} {...handleProps} aria-label={`Drag ${lowerFirst(label)}`}>
                        <EllipsisVerticalIcon className="size-4"/>
                    </button>
                    <MoveButtons label={lowerFirst(label)} index={index} total={total} onMove={onMove} orientation="horizontal" scope="chip"
                                 buttonClassName="bg-accent-caution/70 p-1 h-8 disabled:opacity-40"
                                 iconClassName="size-4"/>
                    <AutowidthInput value={exclusion.match}
                                    aria-label={label} {...invalid}
                                    onChange={onGroupInput}
                                    className={`bg-accent-caution/20 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"
                            aria-label={`Delete ${lowerFirst(label)}`}><XIcon className="size-4"/></button>
                </Row>
            )}
        </SortableRow>
    );
}
