import {Col} from "../components/Col.tsx";
import {SwitchLabel} from "../components/SwitchLabel.tsx";
import {Row} from "../components/Row.tsx";
import {ArrowDownTrayIcon, ArrowUpTrayIcon, ClipboardDocumentListIcon, LinkIcon} from "@heroicons/react/24/outline";
import {ChangeEvent, useMemo, useState} from "react";
import {Parser} from "../parser.ts";
import {
    Expr,
    generate,
    Grammar,
    makeAtom,
    makeGrammar,
    makeRule,
    makeWeighted,
    makeWeightedChoice,
    Rule
} from "../wordgen.ts";
import {Config} from "../pages/Home.tsx";
import {Rule as ConfigRule} from "./RuleInstance.tsx";
import {RulePattern} from "./RuleSection.tsx";
import clipboard from "clipboardy";
import {toast} from "react-toastify";


type GeneratorProps = {
    config: Config
    setEnableWeights: (enable: boolean) => void
    setEnableSerif: (enable: boolean) => void
}

export const Generator = ({config, setEnableWeights, setEnableSerif}: GeneratorProps) => {

    const [generatedWords, setGeneratedWords] = useState<string[]>([])
    const [wordCount, setwordCount] = useState("50")
    const [outputList, setOutputList] = useState(false)
    const [filterDuplicates, setFilterDuplicates] = useState(false)

    const text = useMemo(
        () => outputList ?
            generatedWords.join("\n") :
            generatedWords.join(" "),
        [generatedWords, outputList]
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
        setwordCount(v)
    }

    const onWordCountBlur = () => {
        if (!isPositiveNumber(wordCount)) {
            setwordCount('10')
        }
    }

    const onGenerate = () => {
        const grammar = configToGrammar(config, "Word")

        const words = []
        const count = Number(wordCount)

        for (let i = 0; i < count; i++) {
            words.push(generate(grammar))
        }

        setGeneratedWords(words)
    }

    const onCopy = async () => {
        console.log("Test")
        await clipboard.write(text)
        toast("Words copied to clipboard!")
    }

    return (
        <>
            <Col className="grow bg-primary/5 md:basis-1/2">
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
                        <button className="grow bg-gray-600/30 rounded p-2" title={"Not yet implemented"}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Share link</h1>
                                <LinkIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-gray-600/30 rounded p-2" title={"Not yet implemented"}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Export Config</h1>
                                <ArrowUpTrayIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-gray-600/30 rounded p-2" title={"Not yet implemented"}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Import Config</h1>
                                <ArrowDownTrayIcon className="h-5"/>
                            </Row>
                        </button>
                    </Row>

                    <Row className="gap-4">
                        <Row className="items-center justify-start grow">
                            <button onClick={onGenerate} className="rounded-l bg-primary p-2 grow w-2/3">Generate
                            </button>
                            <input value={wordCount} onInput={onWordCountInput} onBlur={onWordCountBlur}
                                   className="bg-primary/40 rounded-r text-center h-10 outline-0 grow w-1/3"/>
                        </Row>
                        <button className="grow bg-primary rounded p-2" onClick={onCopy}>
                            <Row className="items-center justify-center gap-2">
                                <h1>Copy words</h1>
                                <ClipboardDocumentListIcon className="h-5"/>
                            </Row>
                        </button>
                    </Row>

                    <p className="whitespace-pre-line">
                        {text}
                    </p>

                </Col>
            </Col>
        </>
    )
}

const configToGrammar = (config: Config, root: string): Grammar => {
    const rules = config.rules.map(configRuleToGrammarRule)
    return makeGrammar(root, rules, config.enableWeights)
}

const configRuleToGrammarRule = (rule: ConfigRule): Rule => {

    if (rule.terminalOnly) {
        const ruleExpr = terminalPatternsToExpr(rule.patterns)
        return makeRule(rule.name, ruleExpr, [], [])
    } else {
        const ruleExpr = rulePatternsToExpr(rule.patterns)
        return makeRule(rule.name, ruleExpr, [], [])
    }


}

const terminalPatternsToExpr = (patterns: RulePattern[]): Expr => {
    return makeWeightedChoice(patterns.map(p => makeWeighted(makeAtom(p.pattern), p.weight)))
}

const rulePatternsToExpr = (patterns: RulePattern[]): Expr => {
    return makeWeightedChoice(patterns.map(p => makeWeighted(parse(p.pattern), p.weight)))
}

const parse = (src: string): Expr => (new Parser(src)).parseExpr()
