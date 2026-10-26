import {Col} from "@/components/Col.tsx";
import {SwitchLabel} from "@/components/SwitchLabel.tsx";
import {Row} from "@/components/Row.tsx";
import {ClipboardListIcon, DownloadIcon, LinkIcon, UploadIcon} from "lucide-react";
import {ChangeEvent, Dispatch, FormEvent, useMemo, useRef, useState} from "react";
import {generate} from "@/engine/generate.ts";
import {countCombinations, detectCycle} from "@/engine/analysis.ts";
import {Config} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {toast} from "react-toastify";
import {Grammar} from "@/engine/grammar.ts";
import {parseConfigFile} from "@/engine/configfile.ts";
import {GRAMMAR_ERROR_ID} from "@/features/config/grammarError.ts";

const MAX_WORD_COUNT = 10000

// Word counts are whole numbers in 1..MAX_WORD_COUNT; anything unparsable falls back to a small default.
const clampWordCount = (value: string): number => {
    const n = Math.trunc(Number(value))
    if (value.trim() === "" || Number.isNaN(n)) return 10
    return Math.min(Math.max(n, 1), MAX_WORD_COUNT)
}

type GeneratorProps = {
    config: Config
    grammar: Grammar | null
    error: string | null
    dispatch: Dispatch<ConfigAction>
}

export const Generator = ({config, grammar, error, dispatch}: GeneratorProps) => {

    const [generatedWords, setGeneratedWords] = useState<string[]>([])
    const [wordCount, setWordCount] = useState("50")
    const [outputList, setOutputList] = useState(false)
    const [filterDuplicates, setFilterDuplicates] = useState(false)
    const [generationError, setGenerationError] = useState<string | null>(null)


    const fileInput = useRef<HTMLInputElement>(null)

    const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        // Reset so picking the same file again still fires a change event.
        e.target.value = ""
        if (!file) return

        try {
            dispatch({type: "load", config: parseConfigFile(await file.text())})
            toast("Config imported")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to import config")
        }
    }

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

    const onGenerate = () => {
        setGenerationError(null)

        if (grammar) {
            const words: string[] = []
            const count = clampWordCount(wordCount)
            setWordCount(String(count))

            try {
                for (let i = 0; i < count; i++) {
                    words.push(generate(grammar))
                }
            } catch (e) {
                setGenerationError((e as Error).message)
            }

            setGeneratedWords(words)
        }
    }

    const onCopy = async () => {
        await navigator.clipboard.writeText(text)
        toast("Words copied to clipboard!")
    }

    const onExport = async () => {
        const data = JSON.stringify(config, null, 4)
        const name = config.language.length != 0 ? config.language.replace(" ", "_") : "config"
        const url = URL.createObjectURL(new Blob([data], {type: "text/plain;charset=utf-8"}))
        const link = document.createElement("a")
        link.href = url
        link.download = `${name}.monke`
        link.click()
        // Revoking synchronously can cancel the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 0)
    }

    const onImport = () => {
        fileInput.current?.click()
    }

    const onCopyLink = async () => {
        await navigator.clipboard.writeText(window.location.href)
        toast("Link copied to clipboard!")
    }

    return (
        <Col
            className="grow bg-background md:w-1/2 p-6 gap-4 md:overflow-auto md:no-scrollbar md:border-l-8 border-l-surface">

            <SwitchLabel checked={config.enableWeights} onChange={enabled => dispatch({type: "setEnableWeights", enabled})}
                         label="Enable probability weights"
                         enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/30"/>
            <SwitchLabel checked={config.enableSerif} onChange={enabled => dispatch({type: "setEnableSerif", enabled})}
                         label="Enable serifs (For IPA characters readability)"
                         enabledColor="bg-primary" disabledColor="bg-primary/30"/>
            <SwitchLabel checked={filterDuplicates} onChange={setFilterDuplicates}
                         label="Filter Duplicates"
                         enabledColor="bg-accent-caution" disabledColor="bg-accent-caution/30"/>
            <SwitchLabel checked={outputList} onChange={setOutputList}
                         label="Output as list"
                         enabledColor="bg-secondary" disabledColor="bg-secondary/30"/>

            <div className="border-t border-white/20"/>

            <Row className="gap-4">
                <button className="grow bg-secondary rounded-sm p-2 w-1/3" onClick={onCopyLink} aria-label="Share link">
                    <Row className="items-center justify-center gap-2">
                        <span>Share link</span>
                        <LinkIcon className="size-5"/>
                    </Row>
                </button>
                <button className="grow bg-secondary rounded-sm p-2 w-1/3" onClick={onExport} aria-label="Export config">
                    <Row className="items-center justify-center gap-2">
                        <span>Export Config</span>
                        <UploadIcon className="size-5"/>
                    </Row>
                </button>
                <button className="grow bg-secondary rounded-sm p-2 w-1/3" onClick={onImport} aria-label="Import config">
                    <Row className="items-center justify-center gap-2">
                        <span>Import Config</span>
                        <DownloadIcon className="size-5"/>
                    </Row>
                </button>
                <input ref={fileInput} type="file" accept=".monke" className="hidden" onChange={onFileSelected}
                       aria-hidden="true" tabIndex={-1}/>
            </Row>

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

            <Row className="gap-4">
                <Row className="items-center justify-start grow">
                    <button onClick={onGenerate} className="rounded-l bg-primary p-2 grow w-2/3"
                            aria-label="Generate">Generate
                    </button>
                    <input aria-label="Word count" value={wordCount} onInput={onWordCountInput} onBlur={onWordCountBlur}
                           className="bg-primary/40 rounded-r text-center h-10 outline-0 grow w-1/3"/>
                </Row>
                <button className="grow bg-primary rounded-sm p-2" onClick={onCopy} aria-label="Copy words">
                    <Row className="items-center justify-center gap-2">
                        <span>Copy</span>
                        <ClipboardListIcon className="size-5"/>
                    </Row>
                </button>
            </Row>

            {
                filterDuplicates && generatedWords.length != 0 ?
                    <h3 className="text-center italic text-gray-300">
                        Showing {filteredWords.length} unique words out of {generatedWords.length} generated
                    </h3> :
                    null
            }

            {
                generationError ?
                    <h3 className="text-center italic text-accent-danger">
                        {generationError}
                    </h3> :
                    null
            }


            <p className={`whitespace-pre-line ${config.enableSerif ? "font-serif" : ""}`}>
                {text}
            </p>

        </Col>
    )
}