import {ChangeEvent, Dispatch} from "react";
import {EllipsisVerticalIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {lowerFirst} from "@/components/text.ts";
import {ExclusionPattern, Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {SortableList, SortableRow} from "@/components/SortableList.tsx";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
import {AddButton, SectionLabel} from "./ruleParts.tsx";
import {valueFont} from "./ruleStyles.ts";


export type ExclusionSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
}

export const ExclusionSection = ({rule, dispatch, enableSerif}: ExclusionSectionProps) => {

    const ruleId = rule.id

    return (
        <>
            <SectionLabel tone="text-exclusion" count={rule.exclusions.length}>Exclusions</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
                <SortableList items={rule.exclusions} onMove={(from, to) => dispatch({type: "moveExclusion", ruleId, from, to})}
                              direction="horizontal"
                              describe={e => e.match ? `exclusion ${e.match}` : "empty exclusion"}>
                    {/* Contents-only wrapper: the chips are the list's items, and the add button beside them is not. */}
                    <div role="list" aria-label={`Exclusions of rule ${rule.name}`} className="contents">
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
                    </div>
                </SortableList>
                <AddButton tone="text-primary-text" label={`Add exclusion to rule ${rule.name}`}
                           onClick={() => dispatch({type: "addExclusion", ruleId})}>
                    Exclusion
                </AddButton>
            </div>
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

// A compact chip: a small grip and the text, with the move and delete buttons tucked at the end.
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
    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => onChange({match: e.target.value})
    const small = "flex h-9 md:h-[28px] items-center justify-center rounded-md hover:bg-white/10"

    return (
        <SortableRow id={exclusion.id} role="listitem" draggingClassName="relative z-30 shadow-lg">
            {({handleProps}) => (
                <div className="group/chip flex h-9 md:h-[30px] items-center rounded-md border border-line-strong bg-background pl-1 pr-0.5 focus-within:border-exclusion-line">
                    <button type="button" className={`${small} w-4 text-handle touch-none`} {...handleProps}
                            aria-label={`Drag ${lowerFirst(label)}`}>
                        <EllipsisVerticalIcon className="size-3.5" aria-hidden="true"/>
                    </button>
                    <AutowidthInput value={exclusion.match}
                                    aria-label={label} {...invalid}
                                    onChange={onGroupInput}
                                    spellCheck={false}
                                    className={`bg-transparent px-1.5 outline-0 h-full ${valueFont(enableSerif)}`}
                                    type="text"
                                    minWidth={30}/>
                    <MoveButtons label={lowerFirst(label)} index={index} total={total} onMove={onMove} orientation="horizontal" scope="chip"
                                 buttonClassName={`${small} w-6 disabled:opacity-40 disabled:hover:bg-transparent`}
                                 iconClassName="size-3.5"/>
                    <button type="button" onClick={onDelete} className={`${small} w-6 text-danger-text hover:bg-danger`}
                            aria-label={`Delete ${lowerFirst(label)}`}>
                        <XIcon className="size-3.5" aria-hidden="true"/>
                    </button>
                </div>
            )}
        </SortableRow>
    );
}
