import {GenericProps} from "./GenericProps";
export const Row = ({children, className}: GenericProps<unknown>) => {
    return (
        <div className={`flex flex-row ${className}`}>
            {children}
        </div>
    );
}