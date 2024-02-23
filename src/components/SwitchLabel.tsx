import {GenericProps} from "./GenericProps.tsx";
import {Switch} from "@headlessui/react";
import {Row} from "./Row.tsx";


type SwitchLabelProps = {
    label: string
    labelClass?: string,
    checked: boolean
    onChange: (enabled: boolean) => void
    enabledColor: string
    disabledColor: string
}

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
        <Row className={`${className} items-center gap-4`}>
            <Switch
                checked={checked}
                onChange={onChange}
                className={`${
                    checked ? enabledColor : disabledColor
                } relative inline-flex h-6 w-11 items-center rounded-full`}>
                            <span
                                className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}/>
            </Switch>
            <h1 className={`${labelClass} text-lg`}>{label}</h1>
        </Row>
    )
}