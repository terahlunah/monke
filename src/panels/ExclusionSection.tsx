import {GenericProps} from "../components/GenericProps.tsx";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {ChangeEvent} from "react";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";

export type ExclusionPattern = {
    id: string
    match: string,
}
export type ExclusionPatternProps = {
    exclusion: ExclusionPattern
    onChange: (value: ExclusionPattern) => void
    onDelete?: () => void
    enableSerif?: boolean
}

export const ExclusionPattern = ({
                                     className,
                                     exclusion,
                                     onChange,
                                     onDelete,
                                     enableSerif,
                                 }: GenericProps<ExclusionPatternProps>) => {

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: exclusion.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...exclusion, match: v})
    }

    return (
        <div ref={setNodeRef} style={style} key={exclusion.id} id={exclusion.id}>
            <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
                <button className={`bg-accent-caution p-1 h-8`} {...listeners}>
                    <EllipsisVerticalIcon className="h-4"/>
                </button>
                <AutowidthInput value={exclusion.match}
                                onChange={onGroupInput}
                                className={`bg-accent-caution/20 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/></button>
            </Row>
        </div>
    );
}