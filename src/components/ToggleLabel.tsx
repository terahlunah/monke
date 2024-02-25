import {GenericProps} from "./GenericProps.tsx";


type ToggleLabelProps = {
    label: string
    labelClass?: string,
    checked: boolean
    onChange: (enabled: boolean) => void
    enabledColor: string
    disabledColor: string
}

export const ToggleLabel = ({
                                className,
                                label,
                                checked,
                                onChange,
                                enabledColor,
                                disabledColor
                            }: GenericProps<ToggleLabelProps>) => {
    return (
        <>
            <button onClick={() => onChange(!checked)}
                    className={`${className} ${checked ? enabledColor : disabledColor} p-1 rounded min-w-8`}>{label}</button>
        </>

    )
}