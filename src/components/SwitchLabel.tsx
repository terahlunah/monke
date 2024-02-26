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
        <Row className={`${className} items-center gap-2`}>
            <Switch
                checked={checked}
                onChange={onChange}
                className={`${
                    checked ? enabledColor : disabledColor
                } relative inline-flex h-4 w-8 items-center rounded-full`}>
                            <span
                                className={`${checked ? 'translate-x-4' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition`}/>
            </Switch>
            <h1 className={`${labelClass}`}>{label}</h1>
        </Row>
    )
}