import {GenericProps} from "./GenericProps.tsx";
import {ChangeEvent} from "react";


type EditorProps = {
    onChange: (value: string) => void
}

export const Editor = ({className, onChange}: GenericProps<EditorProps>) => {

    return (
        <div
            contentEditable="true"
            onChange={(e: ChangeEvent<HTMLDivElement>) => onChange(e.target.contentEditable)}
            className={`${className} outline-0 overflow-auto p-4 font-serif`}>
        </div>
    );
}