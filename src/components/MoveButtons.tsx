import {useEffect, useRef} from "react";
import {ChevronDownIcon, ChevronUpIcon} from "lucide-react";

type MoveButtonsProps = {
    // Names the item in the accessible label, e.g. "rule Vowel" gives "Move rule Vowel up".
    label: string
    index: number
    total: number
    onMove: (to: number) => void
    buttonClassName: string
    iconClassName: string
}

// Keyboard and screen reader alternative to dragging. Renders a fragment so the caller controls the layout.
export const MoveButtons = ({label, index, total, onMove, buttonClassName, iconClassName}: MoveButtonsProps) => {
    const up = useRef<HTMLButtonElement>(null)
    const down = useRef<HTMLButtonElement>(null)
    const pressed = useRef<"up" | "down" | null>(null)

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
        <>
            <button type="button" ref={up} className={buttonClassName} disabled={index === 0}
                    aria-label={`Move ${label} up`}
                    onClick={() => {
                        pressed.current = "up"
                        onMove(index - 1)
                    }}>
                <ChevronUpIcon className={iconClassName}/>
            </button>
            <button type="button" ref={down} className={buttonClassName} disabled={index === total - 1}
                    aria-label={`Move ${label} down`}
                    onClick={() => {
                        pressed.current = "down"
                        onMove(index + 1)
                    }}>
                <ChevronDownIcon className={iconClassName}/>
            </button>
        </>
    )
}
