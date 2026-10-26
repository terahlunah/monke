import {ReactNode} from "react";
import {EllipsisVerticalIcon, PlusIcon, XIcon} from "lucide-react";
import {buttonAdd} from "@/components/styles.ts";

// Drag handle. `handleProps` makes it the dnd-kit activator, which also gives it the keyboard drag behaviour.
export const GripButton = ({label, handleProps}: { label: string, handleProps: object }) => (
    <button type="button" className="flex h-9 md:h-[30px] w-[18px] md:w-6 touch-none items-center justify-center rounded-md text-handle hover:bg-white/5"
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

// A rewrites or exclusions label: coloured by kind, with a muted count.
export const SectionLabel = ({tone, count, children}: { tone: string, count: number, children: string }) => (
    <h4 className={`mt-3 text-[13px] font-semibold ${tone}`}>
        {children} <span className="font-normal text-subtle">{count}</span>
    </h4>
)
