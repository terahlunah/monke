import {Dispatch, FormEvent, TextareaHTMLAttributes, useLayoutEffect, useRef, useState} from "react";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {lowerFirst} from "@/components/text.ts";
import {NumberChip} from "@/components/NumberChip.tsx";
import {HelpTip} from "@/components/HelpTip.tsx";
import {Feature, Rule, RulePattern} from "@/engine/config.ts";
import {useMediaQuery} from "@/app/useMediaQuery.ts";
import {ValuesDisplay, ValuesPopover} from "./featureParts.tsx";
import {valueNames} from "./featureNames.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {SortableList, SortableRow} from "@/components/SortableList.tsx";
import {textInput} from "@/components/styles.ts";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
import {GripButton, RowDeleteButton, SectionPanel} from "./ruleParts.tsx";
import {rowInput, rowInputMultiline, valueFont} from "./ruleStyles.ts";


export type RuleSectionProps = {
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableSerif?: boolean
    enableWeights?: boolean
    features?: Feature[]
}

// handle | value | weight and repeat chips (only with weights on) | feature values | actions.
// The chips and feature values cells only exist on wide screens; small ones put the edit button with the row actions,
// and the chips and values on lines under the row. The last column is as wide as the revealed move buttons need.
const columns = {
    // Terminals are a sound or two, so their field stays compact however wide the panel gets.
    plain: "grid-cols-[18px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,10rem)_minmax(0,1fr)_auto]",
    weighted: "grid-cols-[18px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,10rem)_auto_minmax(0,1fr)_auto]",
}

// Patterns run much longer than terminals, so their text takes the whole row; feature values only take what they need.
const patternColumns = {
    plain: "grid-cols-[18px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,1fr)_auto_auto]",
    weighted: "grid-cols-[18px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,1fr)_auto_auto_auto]",
}

// A one-line field that wraps and grows instead of scrolling sideways, so a long pattern stays readable in full.
// Patterns never contain line breaks: Enter is ignored and pasted newlines become spaces.
const PatternField = ({value, onChange, className, ...rest}: {
    value: string
    onChange: (value: string) => void
    className: string
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "className">) => {
    const field = useRef<HTMLTextAreaElement>(null)
    // Browsers without `field-sizing: content` keep a fixed height, so size it to the content after each change.
    useLayoutEffect(() => {
        const el = field.current
        if (!el || CSS.supports?.("field-sizing", "content")) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight}px`
    }, [value])
    return (
        <textarea ref={field} rows={1} value={value} {...rest}
                  onChange={e => onChange(e.currentTarget.value.replace(/\r?\n/g, " "))}
                  onKeyDown={e => {
                      if (e.key === "Enter") e.preventDefault()
                  }}
                  className={`${className} [field-sizing:content] resize-none overflow-hidden wrap-anywhere`}/>
    )
}

export const RuleSection = ({rule, dispatch, enableSerif, enableWeights, features = []}: RuleSectionProps) => {

    const ruleId = rule.id
    const kind = rule.terminalOnly ? "terminal" : "pattern"

    return (
        <SectionPanel kind={kind} title={rule.terminalOnly ? "Terminals" : "Patterns"}
                      addLabel={`Add ${kind} to rule ${rule.name}`}
                      onAdd={() => dispatch({type: "addPattern", ruleId})}
                      controls={enableWeights ? (
                          // One tip per rule rather than per row, so rows stay uncluttered.
                          <HelpTip compact label="About weight and repeat" section="reference-fewer-repeats">
                              <b>Weight</b>: how often this {kind} is picked compared with the others (default 1).
                              {" "}<b>Repeat</b>: each time it was already picked in the word, its weight is multiplied by
                              this number. 1 has no effect, 0.5 halves the chance each repeat, 0 allows it only once.
                              Inside a pattern, write <code className="font-mono">x~0.5</code>.
                          </HelpTip>
                      ) : null}>
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
                                         features={features}
                                         onValues={values => dispatch({type: "setPatternValues", ruleId, id: p.id, values})}
                                         onRepeat={repeat => dispatch({type: "setPatternRepeat", ruleId, id: p.id, repeat})}
                                         enableSerif={enableSerif}
                                         wide={!rule.terminalOnly}/>
                    )}
                </div>
            </SortableList>
            <InlineGrammarError ruleId={ruleId} itemIds={rule.patterns.map(p => p.id)}/>
            {rule.terminalOnly ? (
                <div className="flex items-center pl-6 md:pl-[34px]">
                    <AddSeveral ruleName={rule.name} enableSerif={enableSerif}
                                onAdd={patterns => dispatch({type: "addPatterns", ruleId, patterns})}/>
                </div>
            ) : null}
        </SectionPanel>
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
                   // Without a hint, Android keyboards show Next, which moves focus instead of sending Enter.
                   enterKeyHint="enter"
                   onKeyDown={e => {
                       if (e.nativeEvent.isComposing || e.key !== "Enter") return
                       e.preventDefault()
                       submit()
                   }}
                   aria-label={`Add several terminals to rule ${ruleName}, separated by spaces`}
                   placeholder="Add several, separated by spaces"
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
    features?: Feature[]
    onValues?: (ids: string[]) => void
    onRepeat?: (repeat: number) => void
    // Pattern rules get the wide, wrapping field; terminals stay compact.
    wide?: boolean
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
                                    features = [],
                                    onValues,
                                    onRepeat,
                                    wide = false,
                                }: RulePatternProps) => {
    const desktop = useMediaQuery("(min-width: 768px)")
    const names = valueNames(features, pattern.values)
    const popover = features.length && onValues ?
        <ValuesPopover features={features} selected={pattern.values} label={lowerFirst(label)} onChange={onValues}/> : null

    const invalid = useInvalidProps(ruleId, pattern.id)
    const repeat = pattern.repeat ?? 1
    // The grammar only rejects a negative factor, so only then does the row's error point at this field too.
    const repeatInvalid = repeat < 0 ? invalid : {}

    // Small screens put the chips on a line under the row, so the pattern keeps its width.
    const chips = enableWeight ? (
        <div className={desktop ? "flex items-center gap-1.5" : "col-span-full flex flex-wrap items-center gap-1.5 pl-6 pt-1"}>
            <NumberChip label="Weight" accessibleName={`Weight of ${lowerFirst(label)}`} value={pattern.weight} neutral={1}
                        onCommit={weight => onChange({weight})}/>
            <NumberChip label="Repeat" accessibleName={`Repeat factor of ${lowerFirst(label)}`} value={repeat} neutral={1}
                        onCommit={value => onRepeat?.(value)} {...repeatInvalid}/>
        </div>
    ) : null

    return (
        <SortableRow id={pattern.id} role="listitem" className="group/row border-t border-line py-1 first:border-t-0"
                     draggingClassName="relative z-30 bg-surface shadow-lg">
            {({handleProps}) => (
                <div className={`grid items-center gap-x-1.5 md:gap-x-2.5 ${(wide ? patternColumns : columns)[enableWeight ? "weighted" : "plain"]}`}>
                    <GripButton label={`Drag ${lowerFirst(label)}`} handleProps={handleProps}/>
                    {wide ?
                        <PatternField value={pattern.pattern} aria-label={label} {...invalid}
                                      onChange={value => onChange({pattern: value})}
                                      spellCheck={false}
                                      className={`${rowInputMultiline} ${valueFont(enableSerif)}`}/> :
                        <input type="text" value={pattern.pattern} aria-label={label} {...invalid}
                               onChange={(e: FormEvent<HTMLInputElement>) => onChange({pattern: e.currentTarget.value})}
                               spellCheck={false}
                               className={`${rowInput} ${valueFont(enableSerif)}`}/>}
                    {desktop ? chips : null}
                    {desktop ? <div className="flex min-w-0 items-center gap-0.5"><ValuesDisplay names={names}/>{popover}</div> : null}
                    <div className="flex items-center">
                        {desktop ? null : popover}
                        <MoveButtons label={lowerFirst(label)} index={index} total={total} onMove={onMove} orientation="vertical" scope="row"
                                     buttonClassName="flex size-9 md:size-[30px] items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                                     iconClassName="size-4"/>
                        <RowDeleteButton label={`Delete ${lowerFirst(label)}`} onClick={onDelete}/>
                    </div>
                    {desktop ? null : chips}
                    {!desktop && names.length ? <ValuesDisplay names={names} className="col-span-full pl-6"/> : null}
                </div>
            )}
        </SortableRow>
    );
}
