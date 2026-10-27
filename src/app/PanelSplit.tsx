import {KeyboardEvent, PointerEvent, RefObject, useState} from "react";
import {DEFAULT_SPLIT, KEY_STEP, MAX_SPLIT, MIN_SPLIT} from "./panelSplitPref.ts";

type PanelSplitterProps = {
    split: number
    onChange: (split: number) => void
    container: RefObject<HTMLElement | null>
}

// A window splitter (WAI-ARIA separator pattern): drag with a pointer, or focus it and use the arrow keys,
// Home and End. Double-click or Enter restores the default.
export const PanelSplitter = ({split, onChange, container}: PanelSplitterProps) => {
    const [dragging, setDragging] = useState(false)

    const fromPointer = (clientX: number) => {
        const box = container.current?.getBoundingClientRect()
        if (box && box.width > 0) onChange(((clientX - box.left) / box.width) * 100)
    }

    const onKeyDown = (e: KeyboardEvent) => {
        const next = {
            ArrowLeft: split - KEY_STEP,
            ArrowRight: split + KEY_STEP,
            Home: MIN_SPLIT,
            End: MAX_SPLIT,
            Enter: DEFAULT_SPLIT,
        }[e.key]
        if (next === undefined) return
        e.preventDefault()
        onChange(next)
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a focusable separator is interactive per the WAI-ARIA window splitter pattern
        <div role="separator" aria-orientation="vertical" aria-label="Resize the grammar and words panels"
             aria-valuenow={split} aria-valuemin={MIN_SPLIT} aria-valuemax={MAX_SPLIT}
             aria-valuetext={`Grammar ${split}%, words ${100 - split}%`}
             tabIndex={0}
             onKeyDown={onKeyDown}
             onDoubleClick={() => onChange(DEFAULT_SPLIT)}
             onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
                 e.currentTarget.setPointerCapture(e.pointerId)
                 setDragging(true)
             }}
             onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
                 if (dragging) fromPointer(e.clientX)
             }}
             onPointerUp={() => setDragging(false)}
             onPointerCancel={() => setDragging(false)}
             className="group relative w-1 shrink-0 cursor-col-resize touch-none outline-none">
            {/* A wide invisible hit area over the 1px line, so the handle is easy to grab without taking layout space. */}
            <span aria-hidden="true"
                  className={`absolute inset-y-0 -left-1 w-3 z-10 transition-colors group-hover:bg-primary/40 group-focus-visible:bg-primary/60 ${dragging ? "bg-primary/60" : ""}`}/>
        </div>
    )
}
