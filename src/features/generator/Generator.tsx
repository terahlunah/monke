import {Menu, MenuButton, Radio, RadioGroup} from "@headlessui/react";
import {CheckIcon, DicesIcon, LoaderCircleIcon, SettingsIcon} from "lucide-react";
import {MenuItem, MenuPanel, menuItemClass} from "@/components/menu.tsx";
import {buttonOutline, buttonPrimary, textInput} from "@/components/styles.ts";
import {Dispatch, FormEvent, MouseEvent, useEffect, useMemo, useRef, useState} from "react";
import {randomSeed} from "@/engine/seed.ts";
import {drawAsync} from "./drawAsync.ts";
import {draw} from "./draw.ts";
import {countCombinations, detectCycle} from "@/engine/analysis.ts";
import {featureWarnings} from "@/engine/features.ts";
import {Config} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {toast} from "react-toastify";
import {Grammar} from "@/engine/grammar.ts";
import {setAlwaysShowReorder, useAlwaysShowReorder} from "@/components/reorderPref.ts";
import {GRAMMAR_ERROR_ID} from "@/features/config/grammarError.ts";
import {clampWordCount, GeneratorView} from "./useGeneratorView.ts";
import {listAll} from "./listAll.ts";

// Above this many branches, listing would spend its whole work budget and still show only a sliver of the words.
const LIST_ALL_MAX_BRANCHES = 1_000_000
const LIST_ALL_HINT_ID = "list-all-hint"

// Debounce for grammar edits only; seed and word count changes redraw immediately.
const EDIT_DELAY = 250
// Instant redraws are the norm; the busy look only appears when one is slow enough to be worth explaining.
const SLOW_AFTER = 300

const formatCount = (n: number) => n.toLocaleString("en-US")

const summarizeList = (count: number, truncated: boolean): string =>
    truncated ?
        `Listed first ${formatCount(count)} words (truncated)` :
        `Listed ${formatCount(count)} ${count === 1 ? "word" : "words"}`

const summarize = (words: string[], filterDuplicates: boolean): string => {
    const noun = words.length === 1 ? "word" : "words"
    return filterDuplicates ?
        `Generated ${words.length} ${noun}, ${new Set(words).size} unique` :
        `Generated ${words.length} ${noun}`
}


type GeneratorProps = {
    config: Config
    grammar: Grammar | null
    error: string | null
    dispatch: Dispatch<ConfigAction>
    view: GeneratorView
}

export const Generator = ({config, grammar, error, dispatch, view}: GeneratorProps) => {

    const {wordCount, setWordCount, outputStyle, filterDuplicates, setFilterDuplicates, importNotes, setImportNotes} = view
    // The first words are drawn during the first render: a worker round trip would leave the output empty (and shift
    // the layout when it fills) for the first paints. Later redraws go through the worker.
    const [initial] = useState(() => grammar ? {...draw(grammar, config.seed, clampWordCount(wordCount)), grammar} : null)
    const [generatedWords, setGeneratedWords] = useState<string[]>(initial?.words ?? [])
    const outputList = outputStyle === "list"
    // Redraw failures are shown but not put in an alert: they would interrupt on every keystroke.
    const [generationError, setGenerationError] = useState<{ message: string, live: boolean } | null>(
        initial?.error ? {message: initial.error, live: true} : null)
    // Announced politely after "New words" and "Generate all". The result is deliberately not read out: it can be thousands of words,
    // and screen reader users browse it as text or a list instead.
    const [announcement, setAnnouncement] = useState({text: "", run: 0})


    const alwaysShowReorder = useAlwaysShowReorder()

    const filteredWords = useMemo(
        () => {
            if (filterDuplicates) {
                const set = new Set(generatedWords)
                return [...set]
            } else {
                return generatedWords
            }
        },
        [generatedWords, filterDuplicates]
    )

    const text = useMemo(
        () => outputList ?
            filteredWords.join("\n") :
            filteredWords.join(" "),
        [filteredWords, outputList]
    )

    const [cycle, combinations] = useMemo((): [string[] | null, number] => {
            if (!grammar) return [null, 0]

            const cycle = detectCycle(grammar)
            if (cycle) return [cycle, 0]

            try {
                return [null, countCombinations(grammar)]
            } catch {
                return [null, 0]
            }
        },
        [grammar]
    )

    // Hints that never block generation, e.g. a feature nothing uses.
    const warnings = useMemo(
        () => grammar ? featureWarnings(grammar, new Map(config.features.map(f => [f.name, f.id]))) : [],
        [grammar, config.features]
    )

    const onWordCountInput = (e: FormEvent<HTMLInputElement>) => {
        const v = e.currentTarget.value
        setWordCount(v)
    }

    const onWordCountBlur = () => {
        setWordCount(String(clampWordCount(wordCount)))
    }

    // Set by "New words" so the redraw it causes is announced; edits redraw silently because announcing on every
    // keystroke would talk over the user's typing, and the words are one Tab away.
    const announceNext = useRef(false)
    // Identifies the latest scheduled redraw so results of superseded ones are dropped.
    const drawSeq = useRef(0)
    // The inputs the shown words were drawn from; any difference from the current ones means a redraw is pending.
    const [drawnFor, setDrawnFor] = useState<{ grammar: Grammar, seed: string, count: number } | null>(
        initial ? {grammar: initial.grammar, seed: config.seed, count: clampWordCount(wordCount)} : null)
    // What the output currently shows, if it is a draw of the current inputs (not a "Generate all" listing); lets the
    // effect below skip a redraw that would reproduce the same words.
    const shownDraw = useRef<{ grammar: Grammar, seed: string, count: number } | null>(drawnFor)
    const [listing, setListing] = useState(false)
    const [slow, setSlow] = useState(false)
    const drawing = grammar !== null && (drawnFor === null || drawnFor.grammar !== grammar ||
        drawnFor.seed !== config.seed || drawnFor.count !== clampWordCount(wordCount))
    const busy = drawing || listing
    const lastDrawInputs = useRef({seed: config.seed, wordCount})

    const onNewWords = () => {
        if (!grammar) return
        announceNext.current = true
        dispatch({type: "setSeed", seed: randomSeed()})
    }

    // The words are a pure function of (grammar, seed, word count), so they are recomputed rather than requested.
    useEffect(() => {
        const id = ++drawSeq.current
        if (!grammar) return
        const last = lastDrawInputs.current
        const immediate = last.seed !== config.seed || last.wordCount !== wordCount
        lastDrawInputs.current = {seed: config.seed, wordCount}
        const count = clampWordCount(wordCount)
        const shown = shownDraw.current
        if (shown && shown.grammar === grammar && shown.seed === config.seed && shown.count === count) return
        const timer = setTimeout(() => {
            drawAsync(grammar, config.seed, count).then(({words, error}) => {
                if (id !== drawSeq.current) return
                setGeneratedWords(words)
                setGenerationError(error ? {message: error, live: true} : null)
                setDrawnFor({grammar, seed: config.seed, count})
                shownDraw.current = {grammar, seed: config.seed, count}
                if (announceNext.current) {
                    announceNext.current = false
                    // A failed run is announced by its error alert instead.
                    if (!error) setAnnouncement(({run}) => ({text: summarize(words, filterDuplicates), run: run + 1}))
                }
            }).catch(e => {
                if (id !== drawSeq.current) return
                setGenerationError({message: (e as Error).message, live: true})
                setDrawnFor({grammar, seed: config.seed, count})
                announceNext.current = false
            })
        }, immediate ? 0 : EDIT_DELAY)
        return () => clearTimeout(timer)
    }, [grammar, config.seed, wordCount, filterDuplicates])

    // The pending look is delayed so the usual instant redraw never flickers. Only explicit actions say so aloud.
    useEffect(() => {
        if (!busy) return
        const timer = setTimeout(() => {
            setSlow(true)
            if (announceNext.current || listing) setAnnouncement(({run}) => ({text: "Generating…", run: run + 1}))
        }, SLOW_AFTER)
        return () => {
            clearTimeout(timer)
            setSlow(false)
        }
    }, [busy, listing])

    // Why "Generate all" is unavailable, or null when it can run.
    const listAllBlocker = !grammar || error ? "Generate all needs a valid grammar" :
        cycle ? "Generate all is unavailable: the grammar has a cycle" :
            combinations > LIST_ALL_MAX_BRANCHES ?
                `Generate all is unavailable: more than ${formatCount(LIST_ALL_MAX_BRANCHES)} branches` :
                null

    const onListAll = async () => {
        if (!grammar || listAllBlocker || listing) return
        setGenerationError(null)
        setListing(true)
        try {
            const {words, truncated} = await listAll(grammar)
            setGeneratedWords(words)
            shownDraw.current = null
            setAnnouncement(({run}) => ({text: summarizeList(words.length, truncated), run: run + 1}))
        } catch (e) {
            setGeneratedWords([])
            shownDraw.current = null
            setGenerationError({message: (e as Error).message, live: false})
        } finally {
            setListing(false)
        }
    }

    const onCopy = async () => {
        await navigator.clipboard.writeText(text)
        toast("Words copied to clipboard!")
    }

    const branchSummary = error || !grammar || cycle ? null : `${formatCount(combinations)} possible ${combinations === 1 ? "branch" : "branches"}`

    return (
        <section id="generator" aria-label="Generator" tabIndex={-1}
                 className="flex flex-col bg-surface px-4 py-3.5 md:p-6 gap-3 md:gap-3.5 border-b border-line md:border-b-0 md:border-l md:basis-[440px] md:grow md:min-w-0 md:overflow-auto md:no-scrollbar outline-none">
            <div className="flex items-center gap-2 md:gap-2.5">
                <h2 className="text-[15px] font-semibold">Words</h2>
                {branchSummary ? <p className="text-xs md:text-[13px] text-muted">{branchSummary}</p> : null}
                <div className="grow"/>
                <Menu>
                    <MenuButton aria-label="View settings"
                                className="flex h-10 w-11 md:h-[34px] md:w-[34px] items-center justify-center rounded-md border border-line-strong hover:bg-white/5">
                        <SettingsIcon className="size-4" aria-hidden="true"/>
                    </MenuButton>
                    <MenuPanel anchor="bottom end">
                        <CheckItem checked={config.enableSerif} label="Serif font"
                                   onToggle={() => dispatch({type: "setEnableSerif", enabled: !config.enableSerif})}/>
                        <CheckItem checked={filterDuplicates} label="Filter duplicates"
                                   onToggle={() => setFilterDuplicates(!filterDuplicates)}/>
                        <CheckItem checked={alwaysShowReorder} label="Always show reorder buttons"
                                   onToggle={() => setAlwaysShowReorder(!alwaysShowReorder)}/>
                    </MenuPanel>
                </Menu>
            </div>

            {error ?
                // Inserted on error so assistive tech announces it; inputs at fault reference it via aria-describedby.
                <p id={GRAMMAR_ERROR_ID} role="alert" className="text-sm text-muted">Invalid grammar: {error}</p> :
                !grammar ?
                    <p className="text-sm text-muted">No grammar: choose a start rule</p> :
                    cycle ? <p className="text-sm text-muted">Grammar has at least one cycle: {cycle.join(" > ")}</p> : null
            }
            {warnings.length ? (
                <ul aria-label="Grammar warnings" className="flex flex-col gap-0.5 text-sm text-muted">
                    {warnings.map(w => <li key={w.message}>Warning: {w.message}</li>)}
                </ul>
            ) : null}
            {/* A count only: the list itself is one Tab away and would be long to hear on every edit. */}
            <div aria-live="polite" className="sr-only">{warnings.length ? `${warnings.length} grammar ${warnings.length === 1 ? "warning" : "warnings"}` : ""}</div>

            {/* Everything that decides the drawn words sits on one row: how many, which seed, and a new seed. */}
            <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
                <label htmlFor="word-count" className="text-muted max-md:sr-only">Count</label>
                <input id="word-count" aria-label="Word count" value={wordCount} onChange={onWordCountInput} onBlur={onWordCountBlur}
                       inputMode="numeric"
                       className={`${textInput} h-10 md:h-9 w-[52px] md:w-14 px-1 text-center`}/>
                <label htmlFor="seed" className="text-muted max-md:sr-only">Seed</label>
                <input id="seed" value={config.seed}
                       onChange={e => dispatch({type: "setSeed", seed: e.target.value})}
                       // The output is driven by the seed, so it is never left empty.
                       onBlur={() => {
                           if (config.seed === "") dispatch({type: "setSeed", seed: randomSeed()})
                       }}
                       spellCheck={false}
                       className={`${textInput} h-10 md:h-9 w-[84px] md:w-[92px] px-2 md:px-2.5 font-mono`}/>
                <button onClick={onNewWords} aria-label="New words (new seed)"
                        className={`${buttonPrimary} md:h-9 min-w-[7.5rem] grow`}>
                    New words
                    {slow ?
                        <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-pulse" aria-hidden="true"/> :
                        <DicesIcon className="size-4" aria-hidden="true"/>}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
                <RadioGroup value={outputStyle} onChange={view.setOutputStyle} aria-label="Output style"
                            className="flex overflow-hidden rounded-md border border-line-strong">
                    {(["paragraph", "list"] as const).map(style => (
                        <Radio key={style} value={style}
                               className="h-9 md:h-8 px-2.5 md:px-3 flex items-center cursor-pointer hover:bg-white/5 data-checked:bg-primary-soft data-checked:text-primary-text data-checked:font-semibold">
                            {style === "paragraph" ? "Paragraph" : "List"}
                        </Radio>
                    ))}
                </RadioGroup>
                <div className="grow"/>
                {/* aria-disabled rather than disabled keeps it focusable, so keyboard and screen reader users can reach the reason. */}
                <button onClick={onListAll} className={`${buttonOutline} md:h-8 px-2.5 md:px-3 aria-disabled:opacity-50`}
                        aria-label="Generate all"
                        aria-disabled={listAllBlocker !== null || listing}
                        aria-describedby={listAllBlocker ? LIST_ALL_HINT_ID : undefined}>
                    <span className="md:hidden" aria-hidden="true">All</span>
                    <span className="max-md:hidden" aria-hidden="true">Generate all</span>
                </button>
                <button className={`${buttonOutline} md:h-8 px-2.5 md:px-3`} onClick={onCopy} aria-label="Copy words">
                    Copy
                </button>
            </div>

            {listAllBlocker ?
                <p id={LIST_ALL_HINT_ID} className="text-xs text-muted">{listAllBlocker}</p> :
                null
            }

            {importNotes.length !== 0 ?
                <section aria-labelledby="awkwords-notes-heading"
                         className="flex flex-col gap-2 rounded-lg border border-rewrite-line bg-background p-3.5">
                    <h3 id="awkwords-notes-heading" className="font-semibold text-rewrite">Awkwords import notes</h3>
                    <ul className="list-disc pl-5 flex flex-col gap-1">
                        {importNotes.map((w, i) => <li key={i}>{w.message}</li>)}
                    </ul>
                    <button className={`${buttonOutline} self-end`} onClick={() => setImportNotes([])}>
                        Dismiss import notes
                    </button>
                </section> :
                null
            }

            {
                filterDuplicates && generatedWords.length != 0 ?
                    <p className="text-xs text-muted">
                        Showing {filteredWords.length} unique words out of {generatedWords.length} generated
                    </p> :
                    null
            }

            {
                generationError ?
                    <p role={generationError.live ? undefined : "alert"} className="text-sm text-danger-text">
                        {generationError.message}
                    </p> :
                    null
            }


            {/* A persistent live region: announcements are only reliable from a region that exists before its text changes.
                The keyed child makes a repeated, identical summary announce again. */}
            <div role="status" className="sr-only">
                <p key={announcement.run}>{announcement.text}</p>
            </div>

            {generatedWords.length !== 0 ? <h3 className="sr-only">Generated words</h3> : null}
            {/* Dimmed rather than hidden while stale, so the layout does not jump. */}
            <div aria-busy={busy}
                 className={`rounded-lg border border-line bg-background p-3 md:p-3.5 text-[15px] leading-[1.7] md:leading-[1.8] ${slow ? "opacity-60" : ""}`}>
                {outputList ?
                    <ul className={config.enableSerif ? "font-serif" : ""}>
                        {filteredWords.map((word, i) => <li key={i}>{word}</li>)}
                    </ul> :
                    <p className={`whitespace-pre-line ${config.enableSerif ? "font-serif" : ""}`}>
                        {text}
                    </p>
                }
            </div>

        </section>
    )
}

// Headless UI has no checkbox menu item and always renders role="menuitem", ahead of any role passed in. React leaves an
// attribute alone while its prop is unchanged, so setting the role once from a ref sticks.
const asCheckbox = (el: HTMLElement | null) => el?.setAttribute("role", "menuitemcheckbox")

// A checkbox item of the view settings menu. It stays open after toggling (preventDefault skips Headless UI's close),
// so the new state is read out on the item and several settings can be changed in one visit.
const CheckItem = ({checked, label, onToggle}: { checked: boolean, label: string, onToggle: () => void }) => (
    <MenuItem as="button" type="button" ref={asCheckbox} aria-checked={checked} className={menuItemClass}
              onClick={(e: MouseEvent) => {
                  e.preventDefault()
                  onToggle()
              }}>
        <span className="flex size-4 items-center justify-center rounded-sm border border-current" aria-hidden="true">
            {checked ? <CheckIcon className="size-3.5"/> : null}
        </span>
        {label}
    </MenuItem>
)
