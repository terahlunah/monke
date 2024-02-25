import {GenericProps} from "../components/GenericProps.tsx";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {ChangeEvent} from "react";
import {Row} from "../components/Row.tsx";
import {ChevronDoubleRightIcon, EllipsisVerticalIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";

export type RewritePattern = {
    id: string
    match: string,
    replace: string
}
type RewritePatternProps = {
    rewrite: RewritePattern
    onChange: (rewrite: RewritePattern) => void
    onDelete?: () => void
    enableSerif?: boolean
}
export const RewritePattern = ({
                                   className,
                                   rewrite,
                                   onChange,
                                   onDelete,
                                   enableSerif,
                               }: GenericProps<RewritePatternProps>) => {

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: rewrite.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const onMatchInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, match: v})
    }
    const onReplaceInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onChange({...rewrite, replace: v})
    }


    return (
        <div ref={setNodeRef} style={style} key={rewrite.id} id={rewrite.id}>
            <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
                <button className={`bg-accent-warning p-1 h-8`} {...listeners}>
                    <EllipsisVerticalIcon className="h-4"/>
                </button>
                <AutowidthInput value={rewrite.match}
                                onChange={onMatchInput}
                                className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button className="bg-accent-warning p-1 h-8"><ChevronDoubleRightIcon className="h-4"/></button>
                <AutowidthInput value={rewrite.replace}
                                onChange={onReplaceInput}
                                className={`bg-accent-warning/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
                                type="text"
                                minWidth={15}/>
                <button onClick={onDelete} className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/></button>
            </Row>
        </div>
    );
}