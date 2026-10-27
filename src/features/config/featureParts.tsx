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
        <Popover className="flex shrink-0">
            <PopoverButton aria-label={`Feature values of ${label}`} {...invalid}
                           className="flex size-9 md:size-[30px] shrink-0 items-center justify-center rounded-md text-feature-dim hover:bg-white/10 focus-visible:-outline-offset-2">
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

type FeatureChipsProps = {
    features: Feature[]
    selected: string[] | undefined
    onAdd: (featureId: string) => void
    onRemove: (featureId: string) => void
    // Group name, e.g. "Picks, rule Vowel".
    groupLabel: string
    // Role label, always shown before the chips, e.g. "Picks:". Hidden from assistive tech: the group name says it.
    caption: string
    addLabel: string
    removeLabel: (featureName: string) => string
    invalid?: object
}

// Features selected on a rule: a role label, outlined lime boxes each with its own remove button, and an icon-only
// menu button to add more.
const FeatureChips = ({features, selected, onAdd, onRemove, groupLabel, caption, addLabel, removeLabel, invalid}: FeatureChipsProps) => {
    const chosen = (selected ?? []).flatMap(id => features.filter(f => f.id === id))
    const available = features.filter(f => !chosen.includes(f))
    return (
        <div role="group" aria-label={groupLabel} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] text-muted">{caption}</span>
            {chosen.map(f => (
                <span key={f.id} className="inline-flex h-8 md:h-7 items-center gap-0.5 rounded-md border border-feature-line pl-2 pr-0.5 font-mono text-[13px] text-feature">
                    {f.name || "unnamed"}
                    <button type="button" onClick={() => onRemove(f.id)} aria-label={removeLabel(f.name)}
                            className="flex size-7 md:size-6 items-center justify-center rounded text-feature-dim hover:bg-white/10">
                        <XIcon className="size-3.5" aria-hidden="true"/>
                    </button>
                </span>
            ))}
            {available.length ? (
                <Menu>
                    <MenuButton {...invalid} aria-label={addLabel}
                                className="flex size-8 md:size-6 items-center justify-center rounded-md text-primary-text hover:bg-white/5">
                        <PlusIcon className="size-4" aria-hidden="true"/>
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

type RuleFeatureChipsProps = {
    features: Feature[]
    selected: string[] | undefined
    ruleName: string
    onAdd: (featureId: string) => void
    onRemove: (featureId: string) => void
    invalid?: object
}

// The features that classify the rule's rows: only their values can tag its rows, and filters on them act on the rule.
export const RuleFeatures = ({ruleName, ...rest}: RuleFeatureChipsProps) =>
    <FeatureChips {...rest} groupLabel={`Tags by, rule ${ruleName}`} caption="Tags by:"
                  addLabel={`Add feature that tags rows of rule ${ruleName}`}
                  removeLabel={name => `Remove feature ${name} from rule ${ruleName}`}/>

// The features a rule picks a value for on entry.
export const Chooses = ({ruleName, ...rest}: RuleFeatureChipsProps) =>
    <FeatureChips {...rest} groupLabel={`Picks, rule ${ruleName}`} caption="Picks:"
                  addLabel={`Add feature picked by rule ${ruleName}`}
                  removeLabel={name => `Stop picking ${name} in rule ${ruleName}`}/>
