
import {SwitchLabel} from "@/components/SwitchLabel.tsx";
import {Row} from "@/components/Row.tsx";
import {ClipboardListIcon, DicesIcon, LoaderCircleIcon} from "lucide-react";
import {Dispatch, FormEvent, useEffect, useMemo, useRef, useState} from "react";
import {randomSeed} from "@/engine/seed.ts";
import {drawAsync} from "./drawAsync.ts";
import {countCombinations, detectCycle} from "@/engine/analysis.ts";
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

    const [generatedWords, setGeneratedWords] = useState<string[]>([])
    const {wordCount, setWordCount, outputStyle, filterDuplicates, setFilterDuplicates, importNotes, setImportNotes} = view
    const outputList = outputStyle === "list"
    // Redraw failures are shown but not put in an alert: they would interrupt on every keystroke.
    const [generationError, setGenerationError] = useState<{ message: string, live: boolean } | null>(null)
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
    const [drawnFor, setDrawnFor] = useState<{ grammar: Grammar, seed: string, count: number } | null>(null)
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
        const timer = setTimeout(() => {
            drawAsync(grammar, config.seed, count).then(({words, error}) => {
                if (id !== drawSeq.current) return
                setGeneratedWords(words)
                setGenerationError(error ? {message: error, live: true} : null)
                setDrawnFor({grammar, seed: config.seed, count})
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
            setAnnouncement(({run}) => ({text: summarizeList(words.length, truncated), run: run + 1}))
        } catch (e) {
            setGeneratedWords([])
            setGenerationError({message: (e as Error).message, live: false})
        } finally {
            setListing(false)
        }
    }

    const onCopy = async () => {
        await navigator.clipboard.writeText(text)
        toast("Words copied to clipboard!")
    }

    return (
        <section id="generator" aria-labelledby="generator-heading" tabIndex={-1}
                 className="flex flex-col bg-surface p-4 md:p-6 gap-4 md:basis-0 md:grow md:overflow-auto md:no-scrollbar md:border-l border-line outline-none">
            <h2 id="generator-heading" className="sr-only">Generator</h2>


            <SwitchLabel checked={config.enableSerif} onChange={enabled => dispatch({type: "setEnableSerif", enabled})}
                         label="Enable serifs (For IPA characters readability)"
                         enabledColor="bg-primary" disabledColor="bg-primary/30"/>
            <SwitchLabel checked={filterDuplicates} onChange={setFilterDuplicates}
                         label="Filter Duplicates"
                         enabledColor="bg-accent-caution" disabledColor="bg-accent-caution/30"/>
            <SwitchLabel checked={outputList} onChange={on => view.setOutputStyle(on ? "list" : "paragraph")}
                         label="Output as list"
                         enabledColor="bg-secondary" disabledColor="bg-secondary/30"/>
            <SwitchLabel checked={alwaysShowReorder} onChange={setAlwaysShowReorder}
                         label="Always show reorder buttons"
                         enabledColor="bg-accent-danger" disabledColor="bg-accent-danger/30"/>

            <div className="border-t border-white/20"/>

            {importNotes.length !== 0 ?
                <section aria-labelledby="awkwords-notes-heading"
                         className="flex flex-col gap-2 rounded-sm bg-surface p-4 border-l-4 border-accent-warning">
                    <h3 id="awkwords-notes-heading" className="font-bold">Awkwords import notes</h3>
                    <ul className="list-disc pl-6 flex flex-col gap-1">
                        {importNotes.map((w, i) => <li key={i}>{w.message}</li>)}
                    </ul>
                    <button className="self-end rounded-sm p-2 px-4 bg-white/10" onClick={() => setImportNotes([])}>
                        Dismiss import notes
                    </button>
                </section> :
                null
            }

            <div className="border-t border-white/20"/>

            {error ?
                // Inserted on error so assistive tech announces it; inputs at fault reference it via aria-describedby.
                <p id={GRAMMAR_ERROR_ID} role="alert" className="text-gray-300">Invalid grammar: {error}</p> :
                <p className="text-gray-300">
                    {grammar ?
                        (cycle ?
                            `Grammar has at least one cycle: ${cycle.join(" > ")}` :
                            `Grammar has ${combinations} possible branches`) :
                        "No grammar: choose a start rule"
                    }
                </p>
            }

            <div className="border-t border-white/20"/>

            {/* Everything that decides the drawn words sits on one row: how many, which seed, and a new seed. */}
            <Row className="gap-2 items-center flex-wrap">
                <label htmlFor="word-count" className="shrink-0">Count</label>
                <input id="word-count" aria-label="Word count" value={wordCount} onInput={onWordCountInput} onBlur={onWordCountBlur}
                       inputMode="numeric"
                       className="bg-primary/40 rounded-sm text-center h-10 outline-0 w-16 shrink-0 mr-2"/>
                <label htmlFor="seed" className="shrink-0">Seed</label>
                <input id="seed" value={config.seed}
                       onChange={e => dispatch({type: "setSeed", seed: e.target.value})}
                       // The output is driven by the seed, so it is never left empty.
                       onBlur={() => {
                           if (config.seed === "") dispatch({type: "setSeed", seed: randomSeed()})
                       }}
                       className="bg-primary/40 rounded-sm h-10 px-2 outline-0 w-28 shrink-0"/>
                <button onClick={onNewWords} className="grow bg-primary rounded-sm p-2"
                        aria-label="New words (new seed)">
                    <Row className="items-center justify-center gap-2">
                        <span>New words</span>
                        {slow ?
                            <LoaderCircleIcon className="size-5 animate-spin motion-reduce:animate-pulse"/> :
                            <DicesIcon className="size-5"/>}
                    </Row>
                </button>
            </Row>

            <Row className="gap-4 flex-wrap">
                {/* aria-disabled rather than disabled keeps it focusable, so keyboard and screen reader users can reach the reason. */}
                <button onClick={onListAll} className="grow bg-primary rounded-sm p-2 aria-disabled:opacity-50"
                        aria-disabled={listAllBlocker !== null || listing}
                        aria-describedby={listAllBlocker ? LIST_ALL_HINT_ID : undefined}>
                    Generate all
                </button>
                <button className="grow bg-primary rounded-sm p-2" onClick={onCopy} aria-label="Copy words">
                    <Row className="items-center justify-center gap-2">
                        <span>Copy</span>
                        <ClipboardListIcon className="size-5"/>
                    </Row>
                </button>
            </Row>

            {listAllBlocker ?
                <p id={LIST_ALL_HINT_ID} className="text-center italic text-gray-300">{listAllBlocker}</p> :
                null
            }

            {
                filterDuplicates && generatedWords.length != 0 ?
                    <p className="text-center italic text-gray-300">
                        Showing {filteredWords.length} unique words out of {generatedWords.length} generated
                    </p> :
                    null
            }

            {
                generationError ?
                    <p role={generationError.live ? undefined : "alert"} className="text-center italic text-accent-danger-text">
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
            <div aria-busy={busy} className={slow ? "opacity-60" : ""}>
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