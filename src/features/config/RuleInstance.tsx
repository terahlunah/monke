import {CopyIcon, EllipsisIcon, SquareMinusIcon, SquarePlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {Dispatch, FormEvent} from "react";
import {MenuButton} from "@headlessui/react";
import {ToggleLabel} from "@/components/ToggleLabel.tsx";
import {SortableRow} from "@/components/SortableList.tsx";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {Menu, MenuItem, MenuPanel, menuItemClass} from "@/components/menu.tsx";
import {useMediaQuery} from "@/app/useMediaQuery.ts";
import {Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
import {RuleSection} from "./RuleSection.tsx";
import {RewriteSection} from "./RewriteSection.tsx";
import {ExclusionSection} from "./ExclusionSection.tsx";
import {GripButton} from "./ruleParts.tsx";
import {valueFont} from "./ruleStyles.ts";


export type RuleInstanceProps = {
    index: number
    total: number
    onMove: (to: number) => void
    rule: Rule
    isRoot: boolean
    dispatch: Dispatch<ConfigAction>
    enableWeights?: boolean
    enableSerif?: boolean
}

const iconButton = "flex size-[30px] items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"

export const RuleInstance = ({
                                 rule,
                                 index,
                                 total,
                                 onMove,
                                 isRoot,
                                 dispatch,
                                 enableWeights,
                                 enableSerif,
                             }: RuleInstanceProps) => {

    const ruleId = rule.id
    const invalid = useInvalidProps(ruleId)
    const desktop = useMediaQuery("(min-width: 768px)")
    const name = rule.name

    const onRuleNameInput = (e: FormEvent<HTMLInputElement>) => {
        dispatch({type: "renameRule", ruleId, name: e.currentTarget.value});
    }

    const toggles = rule.terminalOnly ? null : (
        <>
            <ToggleLabel label="Rewrites" accessibleName={`Rewrites of rule ${name}`} checked={rule.showRewrites}
                         onChange={show => dispatch({type: "setShowRewrites", ruleId, show})}
                         tone="rewrite" className="h-8 md:h-7 px-2.5 text-xs"/>
            <ToggleLabel label="Exclusions" accessibleName={`Exclusions of rule ${name}`} checked={rule.showExclusions}
                         onChange={show => dispatch({type: "setShowExclusions", ruleId, show})}
                         tone="exclusion" className="h-8 md:h-7 px-2.5 text-xs"/>
        </>
    )

    // Wide screens show every action; small ones fold them into a menu so the name keeps its room.
    const actions = desktop ? (
        <div className="flex items-center gap-1.5">
            {toggles}
            <MoveButtons label={`rule ${name || index + 1}`} index={index} total={total} onMove={onMove}
                         orientation="vertical" scope="rule"
                         buttonClassName={iconButton}
                         iconClassName="size-5"/>
            <button type="button" onClick={() => dispatch({type: "duplicateRule", ruleId})} className={iconButton}
                    aria-label={`Duplicate rule ${name}`}>
                <CopyIcon className="size-5" aria-hidden="true"/>
            </button>
            <div className="mx-1 h-5 w-px bg-line-strong" aria-hidden="true"/>
            <button type="button" onClick={() => dispatch({type: "removeRule", ruleId})}
                    className="flex size-[30px] items-center justify-center rounded-md bg-danger text-danger-text hover:brightness-125"
                    aria-label={`Delete rule ${name}`}>
                <XIcon className="size-5" aria-hidden="true"/>
            </button>
        </div>
    ) : (
        <Menu>
            <MenuButton className="-mr-1.5 flex size-10 items-center justify-center rounded-md hover:bg-white/10"
                        aria-label={`More actions for rule ${name}`}>
                <EllipsisIcon className="size-5" aria-hidden="true"/>
            </MenuButton>
            <MenuPanel anchor="bottom end">
                <MenuItem disabled={index === 0}>
                    <button type="button" className={menuItemClass} onClick={() => onMove(index - 1)}>
                        Move rule {name || index + 1} up
                    </button>
                </MenuItem>
                <MenuItem disabled={index === total - 1}>
                    <button type="button" className={menuItemClass} onClick={() => onMove(index + 1)}>
                        Move rule {name || index + 1} down
                    </button>
                </MenuItem>
                <MenuItem>
                    <button type="button" className={menuItemClass} onClick={() => dispatch({type: "duplicateRule", ruleId})}>
                        Duplicate rule {name}
                    </button>
                </MenuItem>
                <MenuItem>
                    <button type="button" className={`${menuItemClass} text-danger-text`}
                            onClick={() => dispatch({type: "removeRule", ruleId})}>
                        Delete rule {name}
                    </button>
                </MenuItem>
            </MenuPanel>
        </Menu>
    )

    const inventory = rule.terminalOnly && rule.collapsed ?
        rule.patterns.map(p => p.pattern).filter(p => p !== "").join(" ") :
        ""

    return (
        <SortableRow id={rule.id} className="rounded-[10px] border border-line bg-surface"
                     draggingClassName="relative z-30 shadow-lg border-line-strong">
            {({handleProps}) => (
                <>
                    <h3 className="sr-only">Rule {name}</h3>
                    {/* Identity on the left (handle, disclosure, name, kind), actions on the right with delete set apart at the end. */}
                    <div className={`flex flex-wrap items-center gap-x-2 gap-y-2 px-2.5 py-2 md:gap-x-2.5 md:px-3 ${rule.collapsed ? "" : "border-b border-line"}`}>
                        <GripButton label={`Reorder rule ${name}`} handleProps={handleProps}/>
                        <button type="button" onClick={() => dispatch({type: "toggleCollapse", ruleId})}
                                className="flex size-[30px] items-center justify-center rounded-md text-muted hover:bg-white/10"
                                aria-expanded={!rule.collapsed} aria-label={`Details of rule ${name}`}>
                            {rule.collapsed ?
                                <SquarePlusIcon className="size-5" aria-hidden="true"/> :
                                <SquareMinusIcon className="size-5" aria-hidden="true"/>}
                        </button>
                        <AutowidthInput value={name} onChange={onRuleNameInput} aria-label="Rule name" {...invalid}
                                        minWidth={96}
                                        className={`h-9 md:h-8 rounded-md border border-line-strong bg-background px-2.5 text-[15px] font-semibold outline-0 ${rule.terminalOnly ? "text-terminal" : "text-pattern"}`}/>
                        <span className="text-xs md:text-[13px] text-subtle">
                            {rule.terminalOnly ? "terminal rule" : "pattern rule"}{isRoot ? " · start rule" : ""}
                        </span>
                        {inventory ?
                            <span className={`min-w-0 max-w-full truncate text-[13px] text-muted ${valueFont(enableSerif)}`}>{inventory}</span> :
                            null}
                        <div className="flex-1"/>
                        {actions}
                        {/* On small screens the toggles drop to a line of their own under the name. */}
                        {desktop || !toggles ? null : <div className="flex w-full items-center gap-2">{toggles}</div>}
                    </div>
                    {/* A collapsed rule hides its items, so their errors show under the header instead. */}
                    <div className="px-3">
                        <InlineGrammarError ruleId={ruleId}
                                            itemIds={[null, ...(rule.collapsed ? [...rule.patterns, ...rule.rewrites, ...rule.exclusions].map(p => p.id) : [])]}/>
                    </div>
                    {rule.collapsed ? null : (
                        <div className="flex flex-col gap-1.5 px-2.5 pb-3 pt-1.5 md:px-3">
                            <RuleSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}
                                         enableWeights={enableWeights}/>
                            {rule.showRewrites && !rule.terminalOnly ? (
                                <RewriteSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}/>
                            ) : null}
                            {rule.showExclusions && !rule.terminalOnly ? (
                                <ExclusionSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}/>
                            ) : null}
                        </div>
                    )}
                </>
            )}
        </SortableRow>
    )
}
