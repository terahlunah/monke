import {ReactNode} from "react";
import {
    Announcements,
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    ScreenReaderInstructions,
    TouchSensor,
    UniqueIdentifier,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    horizontalListSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {capitalize} from "./text.ts";

const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: "To pick up this item, press space or enter. Use the arrow keys to move it, space or enter to drop it, and escape to cancel. The move buttons reorder without dragging.",
}

type SortableListProps<T extends { id: string }> = {
    items: T[]
    onMove: (from: number, to: number) => void
    direction: "horizontal" | "vertical"
    // Names an item for screen reader announcements, e.g. "rule Vowel".
    describe: (item: T) => string
    children: ReactNode
}

export const SortableList = <T extends { id: string }>({items, onMove, direction, describe, children}: SortableListProps<T>) => {
    // Touch drags wait for a long press so scrolling a list on a phone doesn't pick items up.
    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor, {activationConstraint: {delay: 250, tolerance: 5}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    )

    const onDragEnd = ({active, over}: DragEndEvent) => {
        if (!over || active.id === over.id) return

        const from = items.findIndex(it => it.id === active.id)
        const to = items.findIndex(it => it.id === over.id)
        if (from === -1 || to === -1) return

        onMove(from, to)
    }

    const name = (id: UniqueIdentifier) => {
        const item = items.find(it => it.id === id)
        return item ? describe(item) : "item"
    }
    const position = (id: UniqueIdentifier) => `position ${items.findIndex(it => it.id === id) + 1} of ${items.length}`

    const announcements: Announcements = {
        onDragStart: ({active}) => `Picked up ${name(active.id)}, ${position(active.id)}.`,
        // Skip the initial over-self event so it doesn't replace the pick-up announcement.
        onDragOver: ({active, over}) => over && over.id !== active.id ? `${capitalize(name(active.id))} is over ${position(over.id)}.` : undefined,
        onDragEnd: ({active, over}) => over && over.id !== active.id ?
            `${capitalize(name(active.id))} moved to ${position(over.id)}.` :
            `${capitalize(name(active.id))} dropped, still at ${position(active.id)}.`,
        onDragCancel: ({active}) => `Move cancelled, ${name(active.id)} is still at ${position(active.id)}.`,
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
                    accessibility={{announcements, screenReaderInstructions}}>
            <SortableContext items={items}
                             strategy={direction === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}

type SortableRowProps = {
    id: string
    role?: string
    // Applies at rest; the dragging class is added on top while the row is picked up.
    className?: string
    draggingClassName?: string
    // Receives the props that make an element the drag handle.
    children: (state: { handleProps: object, isDragging: boolean }) => ReactNode
}

export const SortableRow = ({id, role, className, draggingClassName, children}: SortableRowProps) => {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id})

    return (
        <div ref={setNodeRef}
             style={{transform: CSS.Transform.toString(transform), transition}}
             id={id}
             role={role}
             className={`${className ?? ""} ${isDragging ? draggingClassName ?? "" : ""}`}>
            {children({handleProps: {...attributes, ...listeners}, isDragging})}
        </div>
    )
}
