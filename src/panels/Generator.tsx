import {Col} from "../components/Col.tsx";
import {SwitchLabel} from "../components/SwitchLabel.tsx";
import {Row} from "../components/Row.tsx";
import {ArrowDownTrayIcon, ArrowUpTrayIcon, ClipboardDocumentListIcon, LinkIcon} from "@heroicons/react/24/outline";
import {ChangeEvent, useMemo, useState} from "react";
import {countCombinations, detectCycle, generate} from "../logic/wordgen.ts";
import {Config} from "../pages/Home.tsx";
import clipboard from "clipboardy";
import {toast} from "react-toastify";
import {Grammar} from "../models/grammar.ts";
import {saveAs} from 'file-saver';
import {useFilePicker} from "use-file-picker";
import {decodeConfig, encodeConfig} from "../logic/sharing.ts";

type GeneratorProps = {
    config: Config
    grammar: Grammar | null
    error: string | null
    setEnableWeights: (enable: boolean) => void
    setEnableSerif: (enable: boolean) => void
    setConfig: (config: Config) => void
}

export const Generator = ({config, grammar, error, setEnableWeights, setEnableSerif, setConfig}: GeneratorProps) => {

    const [generatedWords, setGeneratedWords] = useState<string[]>([])
    const [wordCount, setWordCount] = useState("50")
    const [outputList, setOutputList] = useState(false)
    const [filterDuplicates, setFilterDuplicates] = useState(false)
    const [generationError, setGenerationError] = useState<string | null>(null)


    const {openFilePicker} = useFilePicker({
        accept: '.monke',
        onFilesRejected: ({errors}) => {
            console.log('Failed to import config', errors);
            toast("Failed to import config")
        },
        // @ts-ignore
        onFilesSuccessfullySelected: ({filesContent}) => {
            const data: string = filesContent[0].content
            const newConfig = decodeConfig(data)
            setConfig({...config, ...newConfig})
            toast("Config imported")
        },
    });

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

                const combinations = cycles.length != 0 ? 0 : countCombinations(grammar)

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

    const onWordCountInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
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
        await clipboard.write(text)
        toast("Words copied to clipboard!")
    }

    const onExport = () => {
        const data = encodeConfig(config)
        // @ts-ignore
        const file = new File([data], "config.monke", {type: "text/plain;charset=utf-8"});
        saveAs(file);
    }

    const onImport = () => {
        openFilePicker()
    }

    const onCopyLink = async () => {
        await clipboard.write(window.location.href)
        toast("Link copied to clipboard!")
    }

    return (
        <>
            <Col className="grow bg-primary/5 md:w-1/2">
                <div className="bg-primary p-4">Generator</div>

                <Col className="p-6 gap-4 overflow-auto no-scrollbar">

                    <SwitchLabel checked={config.enableWeights} onChange={setEnableWeights}
                                 label="Enable probability weights"
                                 enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/30"/>
                    <SwitchLabel checked={config.enableSerif} onChange={setEnableSerif}
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
                        <button className="grow bg-secondary rounded p-2" onClick={onCopyLink}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Share link</h1>
                                <LinkIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-secondary rounded p-2" onClick={onExport}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Export Config</h1>
                                <ArrowUpTrayIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-secondary rounded p-2" onClick={onImport}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Import Config</h1>
                                <ArrowDownTrayIcon className="h-5"/>
                            </Row>
                        </button>
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
                            <button onClick={onGenerate} className="rounded-l bg-primary p-2 grow w-2/3">Generate
                            </button>
                            <input value={wordCount} onInput={onWordCountInput} onBlur={onWordCountBlur}
                                   className="bg-primary/40 rounded-r text-center h-10 outline-0 grow w-1/3"/>
                        </Row>
                        <button className="grow bg-primary rounded p-2" onClick={onCopy}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Copy</h1>
                                <ClipboardDocumentListIcon className="h-5"/>
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
            </Col>
        </>
    )
}