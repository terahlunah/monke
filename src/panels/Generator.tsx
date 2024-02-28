import {Col} from "../components/Col.tsx";
import {SwitchLabel} from "../components/SwitchLabel.tsx";
import {Row} from "../components/Row.tsx";
import {ArrowDownTrayIcon, ArrowUpTrayIcon, LinkIcon} from "@heroicons/react/24/outline";
import {useState} from "react";
import {Parser} from "../parser.ts";
import {
    Expr,
    generate,
    Grammar,
    makeAtom,
    makeGrammar,
    makeRule, makeWeighted,
    makeWeightedChoice,
    Rule
} from "../wordgen.ts";
import {Config} from "../pages/Home.tsx";
import {Rule as ConfigRule} from "./RuleInstance.tsx";
import {RulePattern} from "./RuleSection.tsx";


type GeneratorProps = {
    config: Config
    setEnableWeights: (enable: boolean) => void
    setEnableSerif: (enable: boolean) => void
}

export const Generator = ({config, setEnableWeights, setEnableSerif}: GeneratorProps) => {

    const [text, setText] = useState("")

    const onGenerate = () => {
        let grammar = configToGrammar(config, "Word")

        let s = generate(grammar)

        setText(s)
    }

    return (
        <>
            <Col className="grow bg-primary/5 md:basis-1/2">
                <div className="bg-primary p-4">Generator</div>

                <Col className="p-6 gap-4 overflow-auto no-scrollbar pb-64">

                    <SwitchLabel checked={config.enableWeights} onChange={setEnableWeights}
                                 label="Enable probability weights"
                                 enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/30"/>
                    <SwitchLabel checked={config.enableSerif} onChange={setEnableSerif}
                                 label="Enable serifs (For IPA characters readability)"
                                 enabledColor="bg-primary" disabledColor="bg-primary/30"/>

                    <div className="h-0.5 bg-white/20"/>

                    <Row className="gap-4">
                        <button className="grow bg-primary rounded p-2">
                            <Row className="items-center justify-center gap-2">
                                <h1>Share link</h1>
                                <LinkIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-primary rounded p-2">
                            <Row className="items-center justify-center gap-2">
                                <h1>Export Config</h1>
                                <ArrowUpTrayIcon className="h-5"/>
                            </Row>
                        </button>
                        <button className="grow bg-primary rounded p-2">
                            <Row className="items-center justify-center gap-2">
                                <h1>Import Config</h1>
                                <ArrowDownTrayIcon className="h-5"/>
                            </Row>
                        </button>
                    </Row>

                    <button onClick={onGenerate} className="bg-primary rounded p-2">Generate Word</button>

                    <p>
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
        let ruleExpr = terminalPatternsToExpr(rule.patterns)
        return makeRule(rule.name, ruleExpr, [], [])
    } else {
        let ruleExpr = rulePatternsToExpr(rule.patterns)
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
