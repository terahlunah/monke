import {MenuButton, Popover, PopoverButton, PopoverPanel} from "@headlessui/react";
import {PlusIcon, TagIcon, XIcon} from "lucide-react";
import {Feature} from "@/engine/config.ts";
import {Menu, MenuItem, MenuPanel, menuItemClass} from "@/components/menu.tsx";

// Lime is reserved for features. Mono with brackets, so values read as a set and never look like a button.
export const ValuesDisplay = ({names, className = ""}: { names: string[], className?: string }) =>
    names.length === 0 ? null :
        <span className={`min-w-0 truncate font-mono text-[13px] text-feature ${className}`}>[{names.join(", ")}]</span>

type ValuesPopoverProps = {
    features: Feature[]
    selected: string[] | undefined
    onChange: (ids: string[]) => void
    // Locates the item, e.g. "terminal 2 of rule Vowel": the button is "Feature values of terminal 2 of rule Vowel".
    label: string
    invalid?: object
}

// Checkboxes grouped by feature in a popover. Headless UI moves focus into the panel, closes on Escape or Tab out,
// and returns focus to the button. Each checkbox announces its own state, so no extra live region is needed.
export const ValuesPopover = ({features, selected, onChange, label, invalid}: ValuesPopoverProps) => {
    const set = new Set(selected ?? [])
    const toggle = (id: string, on: boolean) => {
        const next = new Set(set)
        if (on) next.add(id)
        else next.delete(id)
        // Keep declaration order so the stored list does not depend on click order.
        onChange(features.flatMap(f => f.values.map(v => v.id)).filter(v => next.has(v)))
    }
    return (
        <Popover>
            <PopoverButton aria-label={`Feature values of ${label}`} {...invalid}
                           className="flex size-9 md:size-[30px] items-center justify-center rounded-md text-feature-dim hover:bg-white/10">
                <TagIcon className="size-4" aria-hidden="true"/>
            </PopoverButton>
            <PopoverPanel anchor="bottom end" focus
                          className="z-30 flex min-w-48 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg border border-line-strong bg-surface p-3 text-on-surface shadow-lg [--anchor-gap:4px]">
                <p className="text-sm text-muted">Values of {label}</p>
                {features.map(f => (
                    <fieldset key={f.id} className="flex flex-col gap-1">
                        <legend className="mb-1 font-mono text-[13px] text-on-surface">{f.name || "unnamed feature"}</legend>
                        {f.values.length === 0 ? <p className="text-sm text-subtle">No values yet</p> : null}
                        {f.values.map(v => (
                            <label key={v.id} className="flex h-9 md:h-8 items-center gap-2 rounded-md px-1 font-mono text-sm text-feature hover:bg-white/5">
                                <input type="checkbox" checked={set.has(v.id)} onChange={e => toggle(v.id, e.target.checked)}
                                       className="size-4 accent-feature"/>
                                {v.name || "unnamed"}
                            </label>
                        ))}
                    </fieldset>
                ))}
            </PopoverPanel>
        </Popover>
    )
}

type ChoosesProps = {
    features: Feature[]
    chooses: string[] | undefined
    ruleName: string
    onAdd: (featureId: string) => void
    onRemove: (featureId: string) => void
    invalid?: object
}

// The features a rule picks a value for on entry. Outlined lime boxes, each with its own remove button.
export const Chooses = ({features, chooses, ruleName, onAdd, onRemove, invalid}: ChoosesProps) => {
    const chosen = (chooses ?? []).flatMap(id => features.filter(f => f.id === id))
    const available = features.filter(f => !chosen.includes(f))
    return (
        <div role="group" aria-label={`Features chosen by rule ${ruleName}`} className="flex flex-wrap items-center gap-1.5">
            {chosen.length ? <span className="text-[13px] text-muted">chooses</span> : null}
            {chosen.map(f => (
                <span key={f.id} className="inline-flex h-8 md:h-7 items-center gap-0.5 rounded-md border border-feature-line pl-2 pr-0.5 font-mono text-[13px] text-feature">
                    {f.name || "unnamed"}
                    <button type="button" onClick={() => onRemove(f.id)}
                            aria-label={`Stop choosing ${f.name} in rule ${ruleName}`}
                            className="flex size-7 md:size-6 items-center justify-center rounded text-feature-dim hover:bg-white/10">
                        <XIcon className="size-3.5" aria-hidden="true"/>
                    </button>
                </span>
            ))}
            {available.length ? (
                <Menu>
                    <MenuButton {...invalid} aria-label={`Choose a feature in rule ${ruleName}`}
                                className="inline-flex h-8 md:h-7 items-center gap-1 rounded-md px-1.5 text-[13px] text-primary-text hover:bg-white/5">
                        <PlusIcon className="size-4" aria-hidden="true"/>
                        {chosen.length ? null : "Choose"}
                    </MenuButton>
                    <MenuPanel anchor="bottom start">
                        {available.map(f => (
                            <MenuItem key={f.id}>
                                <button type="button" className={`${menuItemClass} font-mono text-feature`} onClick={() => onAdd(f.id)}>
                                    {f.name || "unnamed feature"}
                                </button>
                            </MenuItem>
                        ))}
                    </MenuPanel>
                </Menu>
            ) : null}
        </div>
    )
}
