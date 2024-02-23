import {GenericProps} from "./GenericProps";

export const Col = ({children, className}: GenericProps<unknown>) => {
    return (
        <div className={`flex flex-col ${className}`}>
            {children}
        </div>
    );
}