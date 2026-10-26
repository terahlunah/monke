import {GenericProps} from "./GenericProps.tsx";


type ToggleLabelProps = {
    // Short visible text, e.g. "Rw".
    label: string
    // Full accessible name, which should contain the visible text so voice control can target it.
    accessibleName: string
    checked: boolean
    onChange: (enabled: boolean) => void
    enabledColor: string
    disabledColor: string
}

export const ToggleLabel = ({
                                className,
                                label,
                                accessibleName,
                                checked,
                                onChange,
                                enabledColor,
                                disabledColor
                            }: GenericProps<ToggleLabelProps>) => {

    return (
        <button onClick={() => onChange(!checked)}
                className={`${className} ${checked ? enabledColor : disabledColor} p-1 rounded-sm min-w-8`}
                aria-pressed={checked}
                aria-label={accessibleName}>{label}</button>
    )
}
