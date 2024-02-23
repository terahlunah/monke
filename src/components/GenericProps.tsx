import {ReactNode} from "react";


export type GenericProps<T> = T & {
    children?: ReactNode,
    className?: string,
};