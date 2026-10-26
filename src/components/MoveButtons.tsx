import {useEffect, useRef} from "react";
import {ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon} from "lucide-react";
import {useAlwaysShowReorder} from "./reorderPref.ts";

type MoveButtonsProps = {
    // Names the item in the accessible label, e.g. "rule Vowel" gives "Move rule Vowel up".
    label: string
    index: number
    total: number
    onMove: (to: number) => void
    // Chips flow horizontally and move left/right; vertical lists move up/down.
    orientation: "horizontal" | "vertical"
    // Which enclosing group (`group/chip` or `group/rule`) reveals the buttons.
    scope: "chip" | "rule"
    buttonClassName: string
    iconClassName: string
}

// Chip buttons are collapsed to zero width rather than display:none so they stay focusable and in the accessibility tree.
// They open on keyboard focus only: revealing on hover shifted the targets under the mouse pointer.
// Rule buttons are few and sit next to other rule controls, so they are always shown to keep that row stable.
// Tailwind only generates complete literal class names, hence the lookup.
const reveal = {
    chip: "max-w-0 group-has-[:focus-visible]/chip:max-w-24",
    rule: "max-w-24",
}

// Keyboard and screen reader alternative to dragging. Sits inline in the item row.
export const MoveButtons = ({label, index, total, onMove, orientation, scope, buttonClassName, iconClassName}: MoveButtonsProps) => {
    const up = useRef<HTMLButtonElement>(null)
    const down = useRef<HTMLButtonElement>(null)
    const pressed = useRef<"up" | "down" | null>(null)
    const always = useAlwaysShowReorder()
    const horizontal = orientation === "horizontal"
    const [backward, forward] = horizontal ? ["left", "right"] : ["up", "down"]
    const BackIcon = horizontal ? ChevronLeftIcon : ArrowUpIcon
    const ForwardIcon = horizontal ? ChevronRightIcon : ArrowDownIcon

    // Reordering can detach the focused node, and the pressed button is disabled once the item reaches an end of the list.
    // Restore focus to it, or to its sibling in that case, so repeated presses and the reading position survive.
    useEffect(() => {
        const was = pressed.current
        if (!was) return
        pressed.current = null
        const same = was === "up" ? up : down
        const other = was === "up" ? down : up
        const target = same.current?.disabled ? other.current : same.current
        target?.focus()
    }, [index])

    return (
        <span className={`flex shrink-0 overflow-hidden transition-[max-width] duration-150 motion-reduce:transition-none ${always ? "max-w-24" : reveal[scope]}`}
              data-reorder-visible={always}>
            <button type="button" ref={up} className={`${buttonClassName} focus-visible:-outline-offset-2`} disabled={index === 0}
                    aria-label={`Move ${label} ${backward}`}
                    onClick={() => {
                        pressed.current = "up"
                        onMove(index - 1)
                    }}>
                <BackIcon className={iconClassName}/>
            </button>
            <button type="button" ref={down} className={`${buttonClassName} focus-visible:-outline-offset-2`} disabled={index === total - 1}
                    aria-label={`Move ${label} ${forward}`}
                    onClick={() => {
                        pressed.current = "down"
                        onMove(index + 1)
                    }}>
                <ForwardIcon className={iconClassName}/>
            </button>
        </span>
    )
}
