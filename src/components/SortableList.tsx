import {ReactNode} from "react";
import {closestCenter, DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors} from "@dnd-kit/core";
import {
    horizontalListSortingStrategy,
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

type SortableListProps<T extends { id: string }> = {
    items: T[]
    onMove: (from: number, to: number) => void
    direction: "horizontal" | "vertical"
    children: ReactNode
}

export const SortableList = <T extends { id: string }>({items, onMove, direction, children}: SortableListProps<T>) => {
    // Touch drags wait for a long press so scrolling a list on a phone doesn't pick items up.
    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor, {activationConstraint: {delay: 250, tolerance: 5}}),
    )

    const onDragEnd = ({active, over}: DragEndEvent) => {
        if (!over || active.id === over.id) return

        const from = items.findIndex(it => it.id === active.id)
        const to = items.findIndex(it => it.id === over.id)
        if (from === -1 || to === -1) return

        onMove(from, to)
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items}
                             strategy={direction === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}

type SortableRowProps = {
    id: string
    draggingClassName?: string
    // Receives the props that make an element the drag handle.
    children: (state: { handleProps: object, isDragging: boolean }) => ReactNode
}

export const SortableRow = ({id, draggingClassName, children}: SortableRowProps) => {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id})

    return (
        <div ref={setNodeRef}
             style={{transform: CSS.Transform.toString(transform), transition}}
             id={id}
             className={isDragging ? draggingClassName : undefined}>
            {children({handleProps: {...attributes, ...listeners}, isDragging})}
        </div>
    )
}
