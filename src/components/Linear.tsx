import {GenericProps} from "./GenericProps";
export const Linear = ({children, className}: GenericProps<unknown>) => {
    return (
        <div className={`flex flex-col md:flex-row ${className}`}>
            {children}
        </div>
    );
}