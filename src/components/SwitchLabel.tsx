import {GenericProps} from "./GenericProps.tsx";
import {Field, Label, Switch} from "@headlessui/react";


type SwitchLabelProps = {
    label: string
    labelClass?: string,
    checked: boolean
    onChange: (enabled: boolean) => void
    enabledColor: string
    disabledColor: string
}

// The visible label names the switch and the switch role reports on/off, so the name stays constant
// (a name like "Disable X" would contradict the announced state).
export const SwitchLabel = ({
                                className,
                                label,
                                labelClass,
                                checked,
                                onChange,
                                enabledColor,
                                disabledColor
                            }: GenericProps<SwitchLabelProps>) => {
    return (
        <Field className={`flex flex-row ${className ?? ""} items-center gap-2`}>
            <Switch
                checked={checked}
                onChange={onChange}
                className={`${
                    checked ? enabledColor : disabledColor
                } relative inline-flex h-4 w-8 items-center rounded-full`}>
                            <span
                                className={`${checked ? 'translate-x-4' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition`}/>
            </Switch>
            <Label className={labelClass}>{label}</Label>
        </Field>
    )
}
