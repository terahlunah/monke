import {GenericProps} from "../components/GenericProps.tsx";
import {ChangeEvent, useEffect, useState} from "react";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";

export type RulePattern = {
    id: string
    pattern: string
    weight: number
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

export const RulePattern = ({
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