import {GenericProps} from "./GenericProps.tsx";


type ButtonProps = {
    onClick?: () => void
}

export const Button = ({children, className, onClick}: GenericProps<ButtonProps>) => {
    return (
        <button className={`rounded shrink-0 overflow-hidden group shadow ${className}`}
                onClick={onClick}>
            <div
                className="flex text-center justify-center px-2 py-2 group-hover:backdrop-brightness-90 group-active:backdrop-brightness-75">
                {children}
            </div>
        </button>
    )
        ;
}