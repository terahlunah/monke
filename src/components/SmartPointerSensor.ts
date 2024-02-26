import type {PointerEvent} from "react";
import {PointerSensor} from "@dnd-kit/core";

/**
 * An extended "PointerSensor" that prevent some
 * interactive html element(button, input, textarea, select, option...) from dragging
 */
export class SmartPointerSensor extends PointerSensor {
    static activators = [
        {
            eventName: "onPointerDown" as any,
            handler: ({nativeEvent: event}: PointerEvent) => {
                if (
                    // !event.isPrimary ||
                    // event.button !== 0 ||
                    !shouldHandleEvent(event.target as HTMLElement)
                ) {
                    return false;
                }

                return true;
            },
        },
    ];
}

function isInteractiveElement(element: HTMLElement | null) {
    const interactiveElements = [
        "button",
        "input",
        "textarea",
        "select",
        "option",
    ];
    if (
        element?.tagName &&
        interactiveElements.includes(element.tagName.toLowerCase())
    ) {
        return true;
    }

    return false;
}

function shouldHandleEvent(element: HTMLElement | null) {
    let cur = element

    while (cur) {
        if (isInteractiveElement(cur)) {
            return false
        }
        cur = cur.parentElement
    }

    return true
}