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
    // Borderless, with a small switch ahead of the label (knob left and hollow when off, right on a filled track
    // when on), for toggles that stand alone in the toolbar, where a tint alone would not say which state is on.
    switchMark?: boolean
}

// Switch look per tone: label colour when on, and the on track (dark shade of the hue) and knob (the hue itself).
// Knob against track is at least 6.5:1 for every tone; off, the hollow knob and track outline use the muted text colour.
const switchTones: Record<ToggleTone, { label: string, track: string, knob: string }> = {
    primary: {label: "aria-pressed:text-primary-text", track: "border-primary bg-primary-soft", knob: "bg-primary-text"},
    rewrite: {label: "aria-pressed:text-rewrite", track: "border-rewrite-line bg-rewrite-bg", knob: "bg-rewrite"},
    exclusion: {label: "aria-pressed:text-exclusion", track: "border-exclusion-line bg-exclusion-bg", knob: "bg-exclusion"},
}

// State lives in aria-pressed, which also drives the styling, so the two cannot disagree.
export const ToggleLabel = ({className, label, accessibleName, checked, onChange, tone, switchMark}: GenericProps<ToggleLabelProps>) => {
    const look = switchMark ?
        `${switchTones[tone].label} rounded-md text-muted hover:text-on-surface` :
        `${tones[tone]} rounded-md border border-line-strong text-muted hover:bg-white/5 aria-pressed:hover:brightness-110`
    return (
        <button type="button" onClick={() => onChange(!checked)}
                className={`${className ?? ""} ${look} inline-flex items-center gap-1.5 whitespace-nowrap`}
                aria-pressed={checked}
                aria-label={accessibleName}>
            {switchMark ? (
                <span aria-hidden="true"
                      className={`flex h-[18px] w-8 shrink-0 items-center rounded-full border-[1.5px] px-px ${checked ? `justify-end ${switchTones[tone].track}` : "justify-start border-current"}`}>
                    <span className={`size-3 rounded-full ${checked ? switchTones[tone].knob : "border-[1.5px] border-current"}`}/>
                </span>
            ) : null}
            {label}
        </button>
    )
}
