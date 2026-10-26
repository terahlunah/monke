import {ChangeEvent, Dispatch} from "react";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {ExclusionPattern, Rule} from "../engine/config.ts";
import {ConfigAction} from "../engine/configReducer.ts";
import {SortableList, SortableRow} from "../components/SortableList.tsx";


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
                <div>Exclusions</div>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <Row className="gap-4 flex-wrap">
                <SortableList items={rule.exclusions} onMove={(from, to) => dispatch({type: "moveExclusion", ruleId, from, to})}
                              direction="horizontal">
                    {rule.exclusions.map(e =>
                        <ExclusionPatternItem key={e.id}
                                              exclusion={e}
                                              onChange={patch => dispatch({type: "editExclusion", ruleId, id: e.id, patch})}
                                              onDelete={() => dispatch({type: "removeExclusion", ruleId, id: e.id})}
                                              enableSerif={enableSerif}/>
                    )}
                </SortableList>

                <button onClick={() => dispatch({type: "addExclusion", ruleId})}
                        className={`bg-accent-caution  mr-4 rounded-sm p-1`}
                        aria-label="Add exclusion pattern">
                    <PlusIcon className="size-6"/>
                </button>
            </Row>
        </>
    );
}


export type ExclusionPatternProps = {
    exclusion: ExclusionPattern
    onChange: (patch: Partial<ExclusionPattern>) => void
    onDelete?: () => void
    enableSerif?: boolean
}

export const ExclusionPatternItem = ({
                                         exclusion,
                                         onChange,
                                         onDelete,
                                         enableSerif,
                                     }: ExclusionPatternProps) => {

    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({match: v})
    }

    return (
        <SortableRow id={exclusion.id}>
            {({handleProps}) => (
                <Row className="rounded-sm overflow-clip w-min h-8 items-center">
                    <button className={`bg-accent-caution p-1 h-8`} {...handleProps} aria-label="Drag exclusion pattern">
                        <EllipsisVerticalIcon className="size-4"/>
                    </button>
                    <AutowidthInput value={exclusion.match}
                                    onChange={onGroupInput}
                                    className={`bg-accent-caution/20 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                    type="text"
                                    minWidth={15}/>
                    <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"
                            aria-label="Delete exclusion pattern"><XIcon className="size-4"/></button>
                </Row>
            )}
        </SortableRow>
    );
}
