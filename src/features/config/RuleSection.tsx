import {Dispatch, FormEvent, useState} from "react";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {lowerFirst} from "@/components/text.ts";
import {Rule, RulePattern} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {SortableList, SortableRow} from "@/components/SortableList.tsx";
import {textInput} from "@/components/styles.ts";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
import {AddButton, GripButton, RowDeleteButton} from "./ruleParts.tsx";
import {rowInput, valueFont} from "./ruleStyles.ts";


export type RuleSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
    enableWeights?: boolean
}

// handle | value | weight (only with weights on) | room for per-item extras | actions.
// The extras cell is empty today and only exists on wide screens; the last column is as wide as the revealed move buttons need.
const columns = {
    plain: "grid-cols-[18px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,1fr)_minmax(0,1.4fr)_auto]",
    weighted: "grid-cols-[18px_minmax(0,1fr)_56px_auto] md:grid-cols-[24px_minmax(0,1fr)_80px_minmax(0,1.4fr)_auto]",
}

export const RuleSection = ({rule, dispatch, enableSerif, enableWeights}: RuleSectionProps) => {

    const ruleId = rule.id
    const kind = rule.terminalOnly ? "terminal" : "pattern"

    return (
        <>
            <h4 className="sr-only">{rule.terminalOnly ? "Terminals" : "Patterns"}</h4>
            <SortableList items={rule.patterns} onMove={(from, to) => dispatch({type: "movePattern", ruleId, from, to})}
                          direction="vertical"
                          describe={p => p.pattern ? `${kind} ${p.pattern}` : `empty ${kind}`}>
                <div role="list" aria-label={`${rule.terminalOnly ? "Terminals" : "Patterns"} of rule ${rule.name}`}
                     className="flex flex-col">
                    {rule.patterns.map((p, index) =>
                        <RulePatternItem key={p.id}
                                         label={`${rule.terminalOnly ? "Terminal" : "Pattern"} ${index + 1} of rule ${rule.name}`}
                                         ruleId={ruleId}
                                         pattern={p}
                                         index={index}
                                         total={rule.patterns.length}
                                         onMove={to => dispatch({type: "movePattern", ruleId, from: index, to})}
                                         onChange={patch => dispatch({type: "editPattern", ruleId, id: p.id, patch})}
                                         onDelete={() => dispatch({type: "removePattern", ruleId, id: p.id})}
                                         enableWeight={enableWeights}
                                         enableSerif={enableSerif}/>
                    )}
                </div>
            </SortableList>
            <InlineGrammarError ruleId={ruleId} itemIds={rule.patterns.map(p => p.id)}/>
            <div className="flex items-center gap-2.5 pt-1.5">
                <AddButton tone="text-primary-text" label={`Add ${kind} to rule ${rule.name}`}
                           onClick={() => dispatch({type: "addPattern", ruleId})}>
                    {rule.terminalOnly ? "Terminal" : "Pattern"}
                </AddButton>
                {rule.terminalOnly ?
                    <AddSeveral ruleName={rule.name} enableSerif={enableSerif}
                                onAdd={patterns => dispatch({type: "addPatterns", ruleId, patterns})}/> :
                    null}
            </div>
        </>
    );
}

type AddSeveralProps = {
    ruleName: string
    enableSerif?: boolean
    onAdd: (terminals: string[]) => void
}

// Terminals are plain text, so whitespace can only be a separator: "p t k" adds three.
const AddSeveral = ({ruleName, enableSerif, onAdd}: AddSeveralProps) => {
    const [text, setText] = useState("")
    // The new rows appear without focus moving, so say how many were added. The text is cleared on the next add
    // by replacing it, which makes a repeated identical count announce again.
    const [added, setAdded] = useState({count: 0, run: 0})

    const submit = () => {
        const terminals = text.split(/\s+/).filter(t => t !== "")
        if (terminals.length === 0) return
        onAdd(terminals)
        setText("")
        setAdded(({run}) => ({count: terminals.length, run: run + 1}))
    }

    return (
        <>
            <input value={text} onChange={e => setText(e.target.value)}
                   onKeyDown={e => {
                       if (e.key !== "Enter") return
                       e.preventDefault()
                       submit()
                   }}
                   aria-label={`Add several terminals to rule ${ruleName}, separated by spaces`}
                   placeholder="Add several: p t k s"
                   spellCheck={false}
                   className={`${textInput} h-9 md:h-[30px] min-w-0 flex-1 bg-transparent border-line ${valueFont(enableSerif)}`}/>
            <div role="status" className="sr-only">
                <p key={added.run}>{added.count === 0 ? "" : `Added ${added.count} ${added.count === 1 ? "terminal" : "terminals"}`}</p>
            </div>
        </>
    )
}


type RulePatternProps = {
    ruleId: string
    // Accessible name that locates the item, e.g. "Pattern 2 of rule Vowel".
    label: string
    index: number
    total: number
    onMove: (to: number) => void
    pattern: RulePattern
    onChange: (patch: Partial<RulePattern>) => void
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
}

function isNumber(value?: string | number): boolean {
    return ((value != null) &&
        (value !== '') &&
        !isNaN(Number(value.toString())));
}

export const RulePatternItem = ({
                                    ruleId,
                                    label,
                                    index,
                                    total,
                                    onMove,
                                    pattern,
                                    onChange,
                                    onDelete,
                                    enableWeight,
                                    enableSerif,
                                }: RulePatternProps) => {

    const invalid = useInvalidProps(ruleId, pattern.id)
    const [weightValue, setWeightValue] = useState(pattern.weight.toString())

    // Resync the text field when the pattern changes, during render rather than in an effect to avoid a cascading render.
    const [syncedPattern, setSyncedPattern] = useState(pattern)
    if (syncedPattern !== pattern) {
        setSyncedPattern(pattern)
        setWeightValue(pattern.weight.toString())
    }

    const onWeightBlur = () => {
        if (isNumber(weightValue)) {
            onChange({weight: +weightValue})
        } else {
            setWeightValue('1')
        }
    }

    return (
        <SortableRow id={pattern.id} role="listitem" className="group/row border-t border-line-row py-1 first:border-t-0"
                     draggingClassName="relative z-30 bg-surface shadow-lg">
            {({handleProps}) => (
                <div className={`grid items-center gap-x-1.5 md:gap-x-2.5 ${enableWeight ? columns.weighted : columns.plain}`}>
                    <GripButton label={`Drag ${lowerFirst(label)}`} handleProps={handleProps}/>
                    <input type="text" value={pattern.pattern} aria-label={label} {...invalid}
                           onChange={(e: FormEvent<HTMLInputElement>) => onChange({pattern: e.currentTarget.value})}
                           spellCheck={false}
                           className={`${rowInput} ${valueFont(enableSerif)}`}/>
                    {enableWeight ? (
                        <input type="text" value={weightValue} aria-label={`Weight of ${lowerFirst(label)}`}
                               onChange={e => setWeightValue(e.target.value)}
                               onBlur={onWeightBlur}
                               inputMode="decimal"
                               className={`${rowInput} text-center text-muted`}/>
                    ) : null}
                    <span className="hidden md:block" aria-hidden="true"/>
                    <div className="flex items-center">
                        <MoveButtons label={lowerFirst(label)} index={index} total={total} onMove={onMove} orientation="vertical" scope="row"
                                     buttonClassName="flex size-9 md:size-[30px] items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                                     iconClassName="size-4"/>
                        <RowDeleteButton label={`Delete ${lowerFirst(label)}`} onClick={onDelete}/>
                    </div>
                </div>
            )}
        </SortableRow>
    );
}
