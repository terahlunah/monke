import {InputHTMLAttributes, useState} from "react";
import {isNumber} from "./text.ts";

type NumberChipProps = {
    // Short visible label, e.g. "Weight". It must start the accessible name.
    label: string
    // Full accessible name that locates the field, e.g. "Weight of pattern 2 of rule Vowel".
    accessibleName: string
    value: number
    // Value with no effect; any other value tints the chip so changed settings stand out.
    neutral: number
    // Called on blur with a number. Text that is not a number is reverted instead.
    onCommit: (value: number) => void
    className?: string
} & Pick<InputHTMLAttributes<HTMLInputElement>, "aria-invalid" | "aria-describedby">

// A labelled number field drawn as a compact chip, like the rule's toggles, so a bare "1" never stands alone. The
// whole chip is the label, so clicking the text focuses the field. Neutral and primary hues only: weights are not a
// kind of grammar item.
export const NumberChip = ({label, accessibleName, value, neutral, onCommit, className, ...invalid}: NumberChipProps) => {
    const [text, setText] = useState(value.toString())
    const [synced, setSynced] = useState(value)
    if (synced !== value) {
        setSynced(value)
        setText(value.toString())
    }
    const changed = value !== neutral

    return (
        <label className={`${className ?? ""} inline-flex h-8 md:h-7 shrink-0 cursor-text items-center gap-0.5 rounded-md border pl-1.5 pr-px text-[11px] ${changed ? "border-primary bg-primary-soft text-primary-text" : "border-line-strong bg-white/[0.03] text-muted"}`}>
            <span>{label}</span>
            <input type="text" value={text} aria-label={accessibleName} {...invalid}
                   onChange={e => setText(e.target.value)}
                   onBlur={() => isNumber(text) ? onCommit(+text) : setText(value.toString())}
                   inputMode="decimal" spellCheck={false}
                   className={`h-6 md:h-[22px] w-8 rounded bg-background/60 text-center text-[13px] outline-0 ${changed ? "text-primary-text" : "text-on-surface"}`}/>
        </label>
    )
}
