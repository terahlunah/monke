import {ReactNode} from "react";
import {Popover, PopoverButton, PopoverPanel} from "@headlessui/react";
import {CircleHelpIcon} from "lucide-react";

type HelpTipProps = {
    // Accessible name of the button; it says what the tip is about and stays constant, e.g. "About repeat weight".
    label: string
    // Published path of the Reference section the tip links to, e.g. "reference-weights".
    section: string
    // A smaller button that sits tight against a compact control (still at least 24px, the minimum target size).
    compact?: boolean
    children: ReactNode
}

// A short explanation opened by click, Enter or Space (never hover, so it works on touch and with a keyboard). Headless UI
// closes it on Escape or an outside click and returns focus to the button. The panel is portaled and anchored, so it
// neither shifts the layout nor leaves the viewport. The Reference link opens the static page in a new tab: the in-app
// tab would replace the grammar being edited.
export const HelpTip = ({label, section, compact, children}: HelpTipProps) => (
    <Popover className="flex shrink-0">
        <PopoverButton aria-label={label}
                       className={`${compact ? "size-6" : "size-8 md:size-6"} flex shrink-0 items-center justify-center rounded-full text-subtle hover:bg-white/10 hover:text-on-surface data-open:text-on-surface`}>
            <CircleHelpIcon className={compact ? "size-3.5" : "size-4"} aria-hidden="true"/>
        </PopoverButton>
        <PopoverPanel anchor={{to: "bottom start", gap: 4, padding: 8}} focus
                      className="z-30 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-lg border border-line-strong bg-surface p-3 text-sm text-on-surface shadow-lg">
            <p>{children}</p>
            <a href={`/reference/#${section}`} target="_blank" rel="noopener noreferrer"
               className="text-primary-text underline">
                Read more in the Reference<span className="sr-only"> (opens in a new tab)</span>
            </a>
        </PopoverPanel>
    </Popover>
)
