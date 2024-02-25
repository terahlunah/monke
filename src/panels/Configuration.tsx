import {Col} from "../components/Col.tsx";
import {useState} from "react";
import {Rule, Rules} from "../components/Rules.tsx";
import {uid} from "uid";

type ConfigurationProps = {
    enableWeights: boolean
    enableSerif: boolean
}

export const Configuration = ({enableWeights, enableSerif}: ConfigurationProps) => {

    const [rules, setRules] = useState<Rule[]>([
        {
            name: "Vowel",
            id: uid(),
            terminalOnly: true,
            patterns: [
                {pattern: "a", id: uid(), weight: 1.0},
                {pattern: "e", id: uid(), weight: 1.0},
                {pattern: "i", id: uid(), weight: 1.0},
                {pattern: "o", id: uid(), weight: 1.0},
                {pattern: "u", id: uid(), weight: 1.0},
            ],
            rewrites: [],
            showRewrites: false,
            exclusions: [],
            showExclusions: false,
        },
        {
            name: "Consonant",
            id: uid(),
            terminalOnly: true,
            patterns: [
                {pattern: "p", id: uid(), weight: 1.0},
                {pattern: "t", id: uid(), weight: 1.0},
                {pattern: "k", id: uid(), weight: 1.0},
                {pattern: "s", id: uid(), weight: 1.0},
                {pattern: "m", id: uid(), weight: 1.0},
                {pattern: "n", id: uid(), weight: 1.0},
                {pattern: "l", id: uid(), weight: 1.0},
                {pattern: "w", id: uid(), weight: 1.0},
                {pattern: "j", id: uid(), weight: 1.0},
            ],
            rewrites: [],
            showRewrites: false,
            exclusions: [],
            showExclusions: false,
        },
        {
            name: "Coda",
            id: uid(),
            terminalOnly: true,
            patterns: [
                {pattern: "n", id: uid(), weight: 1.0},
            ],
            rewrites: [],
            showRewrites: false,
            exclusions: [],
            showExclusions: false,
        },
        {
            name: "Initial",
            id: uid(),
            terminalOnly: false,
            patterns: [
                {pattern: "Consonant.Vowel.Coda", id: uid(), weight: 1.0},
                {pattern: "Consonant.Vowel", id: uid(), weight: 1.0},
                {pattern: "Vowel.Coda", id: uid(), weight: 1.0},
                {pattern: "Vowel", id: uid(), weight: 1.0},
            ],
            rewrites: [],
            showRewrites: false,
            exclusions: [],
            showExclusions: false,
        },
        {
            name: "Syllable",
            id: uid(),
            terminalOnly: false,
            patterns: [
                {pattern: "Consonant.Vowel.Coda", id: uid(), weight: 1.0},
                {pattern: "Consonant.Vowel", id: uid(), weight: 1.0},
            ],
            rewrites: [],
            showRewrites: false,
            exclusions: [],
            showExclusions: false,
        },
        {
            name: "Word",
            id: uid(),
            terminalOnly: false,
            patterns: [
                {pattern: "Initial", id: uid(), weight: 1.0},
                {pattern: "Initial.Syllable", id: uid(), weight: 1.0},
                {pattern: "Initial.Syllable.Syllable", id: uid(), weight: 1.0},
            ],
            rewrites: [],
            showRewrites: false,
            exclusions: [],
            showExclusions: false,
        },
    ]);

    return (
        <>
            <Col className="bg-background md:w-1/2">
                <div className="bg-surface p-4">Configuration</div>

                <Col className="p-6 gap-4 overflow-auto no-scrollbar pb-64">

                    <Rules className="" rules={rules} onRulesChange={setRules} enableWeight={enableWeights}
                           enableSerif={enableSerif}/>

                </Col>

            </Col>
        </>
    )
}