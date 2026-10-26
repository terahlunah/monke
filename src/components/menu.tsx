import {ReactNode, Ref} from "react";
import {Menu, MenuButton, MenuHeading, MenuItem, MenuItems, MenuSection} from "@headlessui/react";
import {ChevronDownIcon} from "lucide-react";

export {Menu, MenuItem}

const panelClass = "z-30 min-w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-line-strong bg-surface text-on-surface py-1 shadow-lg outline-none [--anchor-gap:4px]"

export const menuItemClass = "flex w-full items-center gap-2 px-3 py-2 text-left data-focus:bg-white/10 data-disabled:opacity-40"

// Headless UI portals the panel, so it escapes the clipped, scrolling columns. Not modal: the page behind stays reachable
// and Tab simply closes the menu.
export const MenuPanel = ({children, anchor = "bottom start"}: { children: ReactNode, anchor?: "bottom start" | "bottom end" }) => (
    <MenuItems anchor={anchor} modal={false} className={panelClass}>{children}</MenuItems>
)

// A labelled group of items; Headless UI requires the heading to sit inside its section.
export const MenuGroup = ({heading, children}: { heading: string, children: ReactNode }) => (
    <MenuSection>
        <MenuHeading className="px-3 pt-2 pb-1 text-xs text-muted">{heading}</MenuHeading>
        {children}
    </MenuSection>
)

// A menu trigger with a caret. The caret is decorative; the button's role and expanded state come from Headless UI.
// `buttonRef` lets an action that opens a dialog hand focus back to the trigger, since the menu item it was chosen from is gone.
export const MenuTrigger = ({className, children, buttonRef, caret = true}: {
    className: string
    children: ReactNode
    buttonRef?: Ref<HTMLButtonElement>
    caret?: boolean
}) => (
    <MenuButton ref={buttonRef} className={className}>
        {children}
        {caret ? <ChevronDownIcon className="size-4" aria-hidden="true"/> : null}
    </MenuButton>
)
