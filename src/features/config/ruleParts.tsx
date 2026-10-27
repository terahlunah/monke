import {ReactNode} from "react";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import {buttonAdd} from "@/components/styles.ts";

// Drag handle. `handleProps` makes it the dnd-kit activator, which also gives it the keyboard drag behaviour.
export const GripButton = ({label, handleProps}: { label: string, handleProps: object }) => (
    <button type="button" className="flex h-9 md:h-[30px] w-6 touch-none items-center justify-center rounded-md text-subtle hover:bg-white/5"
            aria-label={label} {...handleProps}>
        <EllipsisVerticalIcon className="size-5" aria-hidden="true"/>
    </button>
)

export const RowDeleteButton = ({label, onClick}: { label: string, onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label={label}
            className="flex size-9 md:size-[30px] items-center justify-center rounded-md text-danger-text hover:bg-danger">
        <XIcon className="size-4" aria-hidden="true"/>
    </button>
)

// Quiet text button that adds an item to a list. The colour says what kind of item, the label says which rule.
export const AddButton = ({label, tone, onClick, children}: {
    label: string
    tone: string
    onClick: () => void
    children: ReactNode
}) => (
    <button type="button" onClick={onClick} aria-label={label} className={`${buttonAdd} ${tone}`}>
        <PlusIcon className="size-4" aria-hidden="true"/>
        {children}
    </button>
)

export type SectionKind = "terminal" | "pattern" | "rewrite" | "exclusion"

const sectionTones: Record<SectionKind, { panel: string, title: string }> = {
    terminal: {panel: "bg-terminal-tint", title: "text-terminal"},
    pattern: {panel: "bg-pattern-tint", title: "text-pattern"},
    rewrite: {panel: "bg-rewrite-tint", title: "text-rewrite"},
    exclusion: {panel: "bg-exclusion-tint", title: "text-exclusion"},
}

type SectionPanelProps = {
    kind: SectionKind
    // Section name, e.g. "Rewrites".
    title: string
    // Enable switch, right after the title so showing or hiding the add button never moves it.
    toggle?: ReactNode
    // Controls at the right of the header, before the add button, e.g. a help tip.
    controls?: ReactNode
    // Accessible name of the add button, e.g. "Add rewrite to rule Word". Absent hides the button (a disabled section).
    addLabel?: string
    onAdd?: () => void
    children?: ReactNode
}

// A rule body section drawn as a softly tinted block in its kind's hue: a header row (name and switch on the left, the
// add button on the right) above its rows. The heading keeps the rule's heading outline.
export const SectionPanel = ({kind, title, toggle, controls, addLabel, onAdd, children}: SectionPanelProps) => (
    <section className={`flex flex-col gap-1 rounded-lg px-1.5 pb-1.5 pt-1 md:px-2 ${sectionTones[kind].panel}`}>
        <div className="flex min-h-9 md:min-h-8 items-center gap-1.5">
            <h4 className={`pl-1 text-[13px] font-semibold ${sectionTones[kind].title}`}>
                {title}
            </h4>
            {toggle}
            <div className="flex-1"/>
            {controls}
            {addLabel && onAdd ? (
                <button type="button" onClick={onAdd} aria-label={addLabel}
                        className={`flex size-8 md:size-7 items-center justify-center rounded-md hover:bg-white/10 ${sectionTones[kind].title}`}>
                    <PlusIcon className="size-4" aria-hidden="true"/>
                </button>
            ) : null}
        </div>
        {children}
    </section>
)
