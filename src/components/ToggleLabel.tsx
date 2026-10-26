import {GenericProps} from "./GenericProps.tsx";

export type ToggleTone = "primary" | "rewrite" | "exclusion"

// On states use the tone's own fill and border; off is the same neutral outline for all of them.
const tones: Record<ToggleTone, string> = {
    primary: "aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-text",
    rewrite: "aria-pressed:border-rewrite-line aria-pressed:bg-rewrite-bg aria-pressed:text-rewrite",
    exclusion: "aria-pressed:border-exclusion-line aria-pressed:bg-exclusion-bg aria-pressed:text-exclusion",
}

type ToggleLabelProps = {
    // Visible text, e.g. "Rewrites".
    label: string
    // Full accessible name, which should contain the visible text so voice control can target it.
    accessibleName?: string
    checked: boolean
    onChange: (enabled: boolean) => void
    tone: ToggleTone
    // A small indicator ahead of the label that fills in when on, for toggles that stand alone in the toolbar.
    dot?: boolean
}

// State lives in aria-pressed, which also drives the styling, so the two cannot disagree.
export const ToggleLabel = ({className, label, accessibleName, checked, onChange, tone, dot}: GenericProps<ToggleLabelProps>) => {
    return (
        <button type="button" onClick={() => onChange(!checked)}
                className={`${className ?? ""} ${tones[tone]} inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line-strong text-muted hover:bg-white/5 aria-pressed:hover:brightness-110`}
                aria-pressed={checked}
                aria-label={accessibleName}>
            {dot ? <span aria-hidden="true"
                         className={`size-2 rounded-full border-[1.5px] ${checked ? "bg-current border-current" : "border-current"}`}/> : null}
            {label}
        </button>
    )
}
