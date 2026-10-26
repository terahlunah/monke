import {Col} from "../components/Col.tsx";
import {SwitchLabel} from "../components/SwitchLabel.tsx";
import {Row} from "../components/Row.tsx";
import {ClipboardListIcon, DownloadIcon, LinkIcon, UploadIcon} from "lucide-react";
import {ChangeEvent, FormEvent, useMemo, useRef, useState} from "react";
import {countCombinations, detectCycle, generate} from "../logic/wordgen.ts";
import {Config} from "../pages/Home.tsx";
import {toast} from "react-toastify";
import {Grammar} from "../models/grammar.ts";

type GeneratorProps = {
    config: Config
    grammar: Grammar | null
    error: string | null
    updateConfig: (patch: Partial<Config>) => void
}

export const Generator = ({config, grammar, error, updateConfig}: GeneratorProps) => {

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

        const newConfig = JSON.parse(await file.text())
        updateConfig(newConfig)
        toast("Config imported")
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

    const [cycle, combinations] = useMemo((): [string[], number] => {
            if (grammar) {
                const cycles = detectCycle(grammar) ?? []

                let combinations: number

                try {
                    combinations = cycles.length != 0 ? 0 : countCombinations(grammar)
                } catch {
                    combinations = 0
                }

                return [cycles, combinations]
            } else {
                return [[""], 0]
            }
        },
        [grammar]
    )

    function isPositiveNumber(value?: string | number): boolean {
        return ((value != null) &&
            (value !== '') &&
            !isNaN(Number(value.toString())) &&
            Number(value.toString()) >= 0
        );
    }

    const onWordCountInput = (e: FormEvent<HTMLInputElement>) => {
        const v = e.currentTarget.value
        setWordCount(v)
    }

    const onWordCountBlur = () => {
        if (!isPositiveNumber(wordCount)) {
            setWordCount('10')
        }
    }

    const onGenerate = () => {

        setGenerationError("")

        if (grammar) {
            const words = []
            const count = Number(wordCount)

            for (let i = 0; i < count; i++) {

                try {
                    words.push(generate(grammar))
                } catch (e) {
                    setGenerationError((e as Error).message)
                }

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
        URL.revokeObjectURL(url)
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

            <SwitchLabel checked={config.enableWeights} onChange={enableWeights => updateConfig({enableWeights})}
                         label="Enable probability weights"
                         enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/30"/>
            <SwitchLabel checked={config.enableSerif} onChange={enableSerif => updateConfig({enableSerif})}
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
                        <h1>Share link</h1>
                        <LinkIcon className="size-5"/>
                    </Row>
                </button>
                <button className="grow bg-secondary rounded-sm p-2 w-1/3" onClick={onExport} aria-label="Export config">
                    <Row className="items-center justify-center gap-2">
                        <h1>Export Config</h1>
                        <UploadIcon className="size-5"/>
                    </Row>
                </button>
                <button className="grow bg-secondary rounded-sm p-2 w-1/3" onClick={onImport} aria-label="Import config">
                    <Row className="items-center justify-center gap-2">
                        <h1>Import Config</h1>
                        <DownloadIcon className="size-5"/>
                    </Row>
                </button>
                <input ref={fileInput} type="file" accept=".monke" className="hidden" onChange={onFileSelected}
                       aria-hidden="true" tabIndex={-1}/>
            </Row>

            <div className="border-t border-white/20"/>

            <h3 className="text-gray-300">
                {grammar ?
                    (cycle.length != 0 ?
                        `Grammar has at least cycle one cycle: ${cycle}` :
                        `Grammar has ${combinations} possible branches`) :
                    `Invalid grammar: ${error}`
                }
            </h3>

            <div className="border-t border-white/20"/>

            <Row className="gap-4">
                <Row className="items-center justify-start grow">
                    <button onClick={onGenerate} className="rounded-l bg-primary p-2 grow w-2/3"
                            aria-label="Generate">Generate
                    </button>
                    <input value={wordCount} onInput={onWordCountInput} onBlur={onWordCountBlur}
                           className="bg-primary/40 rounded-r text-center h-10 outline-0 grow w-1/3"/>
                </Row>
                <button className="grow bg-primary rounded-sm p-2" onClick={onCopy} aria-label="Copy words">
                    <Row className="items-center justify-center gap-2">
                        <h1>Copy</h1>
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