import {GenericProps} from "./GenericProps.tsx";
import {Row} from "./Row.tsx";
import {PlusIcon, TrashIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent} from "react";
import {Col} from "./Col.tsx";
import cloneDeep from "lodash.clonedeep"

type Exclusion = {
    pattern: string,
}

type ExclusionsProps = {
    exclusions: Exclusion[]
    onExclusionsChange: (exclusions: Exclusion[]) => void
    enableSerif?: boolean
}

export const Exclusions = (
    {
        className,
        exclusions,
        onExclusionsChange,
        enableSerif
    }: GenericProps<ExclusionsProps>) => {

    const onExclusionChangeIndex = (index: number) => {
        return (exclusion: Exclusion) => {
            const newExclusion = cloneDeep(exclusions)
            newExclusion[index] = exclusion
            onExclusionsChange(newExclusion)
        }
    }

    const onExclusionDeleteIndex = (index: number) => {
        return () => {
            const newExclusion = cloneDeep(exclusions)
            newExclusion.splice(index, 1)
            onExclusionsChange(newExclusion)
        }
    }

    const onExclusionAdd = () => {
        const newExclusion = cloneDeep(exclusions)
        newExclusion.push({pattern: ""})
        onExclusionsChange(newExclusion)
    }


    return (
        <Col className={`${className}`}>
            <Row className="items-center gap-4">
                <h1 className="pb-4 text-3xl">Exclusions</h1>
                <hr className="grow h-0.5 border-t-0 bg-accent-danger"/>
            </Row>

            <Col className={`${className} rounded bg-surface p-2 gap-2`}>
                <Row className="gap-4 flex-wrap">
                    {exclusions.map((r, index) =>
                        <ExclusionItem exclusion={r}
                                       onChange={onExclusionChangeIndex(index)}
                                       onDelete={onExclusionDeleteIndex(index)}
                                       enableSerif={enableSerif}/>
                    )}
                    <button onClick={onExclusionAdd} className="bg-accent-danger mr-4 rounded p-1">
                        <PlusIcon className="h-6"/>
                    </button>
                </Row>
            </Col>
        </Col>
    )
}

type ExclusionItemProps = {
    exclusion: Exclusion
    onChange: (exclusion: Exclusion) => void
    onDelete?: () => void
    enableSerif?: boolean
}

const ExclusionItem = ({
                           className,
                           exclusion,
                           onChange,
                           onDelete,
                           enableSerif,
                       }: GenericProps<ExclusionItemProps>) => {


    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...exclusion, pattern: v})
    }

    return (
        <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
            <button onClick={onDelete} className="bg-accent-danger p-1 h-8"><TrashIcon className="h-4"/></button>
            <AutowidthInput value={exclusion.pattern}
                            onChange={onMatchInput}
                            className={`bg-accent-danger/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                            type="text"
                            minWidth={15}/>
        </Row>
    );
}