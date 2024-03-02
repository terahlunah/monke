import {
    MouseSensor,
    MouseSensorOptions,
    PointerSensor,
    PointerSensorOptions,
    PointerSensorProps,
    TouchSensor, TouchSensorOptions
} from "@dnd-kit/core";
import type {MouseEvent, PointerEvent, TouchEvent} from 'react';
import {MouseSensorProps, TouchSensorProps} from "@dnd-kit/core/dist/sensors";

/**
 * An extended "PointerSensor" that prevent some
 * interactive html element(button, input, textarea, select, option...) from dragging
 */
export class SmartPointerSensor extends PointerSensor {
    constructor(props: PointerSensorProps) {
        super(props);
    }

    static activators = [
        {
            eventName: "onPointerDown" as const,
            handler: (
                {nativeEvent: event}: PointerEvent,
                {onActivation}: PointerSensorOptions
            ) => {
                if (
                    !event.isPrimary ||
                    event.button !== 0 ||
                    !shouldHandleEvent(event.target as HTMLElement)
                ) {
                    return false;
                }

                onActivation?.({event});

                return true;
            },
        },
    ];
}

/**
 * An extended "MouseSensor" that prevent some
 * interactive html element(button, input, textarea, select, option...) from dragging
 */
export class SmartMouseSensor extends MouseSensor {
    constructor(props: MouseSensorProps) {
        super(props);
    }

    static activators = [
        {
            eventName: "onMouseDown" as const,
            handler: (
                {nativeEvent: event}: MouseEvent,
                {onActivation}: MouseSensorOptions
            ) => {
                if (
                    event.button === 2 ||
                    !shouldHandleEvent(event.target as HTMLElement)
                ) {
                    return false;
                }

                onActivation?.({event});

                return true;
            },
        },
    ];
}

/**
 * An extended "MouseSensor" that prevent some
 * interactive html element(button, input, textarea, select, option...) from dragging
 */
export class SmartTouchSensor extends TouchSensor {
    constructor(props: TouchSensorProps) {
        super(props);
    }

    static activators = [
        {
            eventName: 'onTouchStart' as const,
            handler: (
                {nativeEvent: event}: TouchEvent,
                {onActivation}: TouchSensorOptions
            ) => {

                const {touches} = event;

                if (touches.length > 1 || !shouldHandleEvent(event.target as HTMLElement)) {
                    return false;
                }

                onActivation?.({event});

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