import {CopyIcon, EllipsisIcon, SquareMinusIcon, SquarePlusIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {Dispatch, FormEvent} from "react";
import {MenuButton} from "@headlessui/react";
import {SortableRow} from "@/components/SortableList.tsx";
import {HelpTip} from "@/components/HelpTip.tsx";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {Menu, MenuItem, MenuPanel, menuItemClass} from "@/components/menu.tsx";
import {useMediaQuery} from "@/app/useMediaQuery.ts";
import {Feature, Rule} from "@/engine/config.ts";
import {RULE_CHOOSES_ITEM, RULE_CLASSIFIES_ITEM} from "@/engine/features.ts";
import {Chooses, RuleFeatures} from "./featureParts.tsx";
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
    features?: Feature[]
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
                                 features = [],
                             }: RuleInstanceProps) => {

    const ruleId = rule.id
    const invalid = useInvalidProps(ruleId)
    const invalidChooses = useInvalidProps(ruleId, RULE_CHOOSES_ITEM)
    const invalidFeatures = useInvalidProps(ruleId, RULE_CLASSIFIES_ITEM)
    const desktop = useMediaQuery("(min-width: 768px)")
    const name = rule.name

    const onRuleNameInput = (e: FormEvent<HTMLInputElement>) => {
        dispatch({type: "renameRule", ruleId, name: e.currentTarget.value});
    }

    // Wide screens show every action; small ones fold them into a menu so the name keeps its room.
    const actions = desktop ? (
        <div className="flex items-center gap-1.5">
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

    // Only once features exist, so grammars without them keep a quiet header.
    const featureControls = features.length ? (
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-2 md:before:h-4 md:before:w-px md:before:bg-line-strong md:before:content-['']">
            <RuleFeatures features={features} selected={rule.classifies} ruleName={name} invalid={invalidFeatures}
                          onAdd={featureId => dispatch({type: "addRuleFeature", ruleId, featureId})}
                          onRemove={featureId => dispatch({type: "removeRuleFeature", ruleId, featureId})}/>
            <Chooses features={features} selected={rule.chooses} ruleName={name} invalid={invalidChooses}
                     onAdd={featureId => dispatch({type: "addRuleChoice", ruleId, featureId})}
                     onRemove={featureId => dispatch({type: "removeRuleChoice", ruleId, featureId})}/>
            <HelpTip label="About rule features" section="reference-rule-features">
                <b>Tags by</b>: the features that classify this rule's rows. A row without a value of one counts as
                none of them, and filters like <code>{"<a>"}</code> act on these rows. <b>Picks</b>: each use of
                the rule picks one value of the feature for everything below it, as in vowel harmony.
            </HelpTip>
        </span>
    ) : null

    // Rows can only carry values of the features the rule declares.
    const classifying = features.filter(f => rule.classifies?.includes(f.id))

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
                        {/* Identity shrinks (name) or wraps (feature controls, wide screens) inside its own box, so the actions
                            stay at the right end of the title line. */}
                        <div className="flex min-w-0 flex-1 items-center gap-x-2 gap-y-2 md:flex-wrap md:gap-x-2.5">
                        <GripButton label={`Reorder rule ${name}`} handleProps={handleProps}/>
                        <button type="button" onClick={() => dispatch({type: "toggleCollapse", ruleId})}
                                className="flex size-[30px] items-center justify-center rounded-md text-muted hover:bg-white/10"
                                aria-expanded={!rule.collapsed} aria-label={`Details of rule ${name}`}>
                            {rule.collapsed ?
                                <SquarePlusIcon className="size-5" aria-hidden="true"/> :
                                <SquareMinusIcon className="size-5" aria-hidden="true"/>}
                        </button>
                        <AutowidthInput value={name} onChange={onRuleNameInput} aria-label="Rule name" {...invalid}
                                        minWidth={desktop ? 96 : 56}
                                        className={`h-9 md:h-8 min-w-0 shrink rounded-md border border-line-strong bg-background px-2.5 text-[15px] font-semibold outline-0 ${rule.terminalOnly ? "text-terminal" : "text-pattern"}`}/>
                        <span className="shrink-0 text-xs md:text-[13px] text-subtle">
                            {rule.terminalOnly ? "terminal" : "pattern"}<span className="max-md:hidden"> rule</span>{isRoot ? " · start" : ""}<span className="max-md:hidden">{isRoot ? " rule" : ""}</span>
                        </span>
                        {desktop ? featureControls : null}
                        {inventory ?
                            <span className={`min-w-0 max-w-full truncate ml-1 px-2 py-0.5 rounded-md border border-terminal/30 bg-terminal/10 text-[13px] text-terminal ${valueFont(enableSerif)}`}>{inventory}</span> :
                            null}
                        </div>
                        <div className="ml-auto flex shrink-0 justify-end">{actions}</div>
                        {/* On small screens the feature controls and toggles drop to a line of their own under the name. */}
                        {desktop || !featureControls ? null : (
                            <div className="flex w-full flex-wrap items-center gap-2">{featureControls}</div>
                        )}
                    </div>
                    {/* A collapsed rule hides its items, so their errors show under the header instead. */}
                    <div className="px-3">
                        <InlineGrammarError ruleId={ruleId}
                                            itemIds={[null, RULE_CLASSIFIES_ITEM, RULE_CHOOSES_ITEM, ...(rule.collapsed ? [...rule.patterns, ...rule.rewrites, ...rule.exclusions].map(p => p.id) : [])]}/>
                    </div>
                    {rule.collapsed ? null : (
                        <div className="flex flex-col gap-1.5 px-2.5 pb-3 pt-1.5 md:px-3">
                            <RuleSection rule={rule} dispatch={dispatch} enableSerif={enableSerif} features={classifying}
                                         enableWeights={enableWeights}/>
                            {rule.terminalOnly ? null : <>
                                <RewriteSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}/>
                                <ExclusionSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}/>
                            </>}
                        </div>
                    )}
                </>
            )}
        </SortableRow>
    )
}
