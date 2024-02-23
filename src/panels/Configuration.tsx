import {Col} from "../components/Col.tsx";
import {Groups} from "../components/Groups.tsx";
import {useState} from "react";
import {SwitchLabel} from "../components/SwitchLabel.tsx";
import {Rules} from "../components/Rules.tsx";

export const Configuration = () => {

    const [enableWeights, setEnableWeights] = useState(false)
    const [enableSerif, setEnableSerif] = useState(false)
    const [groups, setGroups] = useState([
        {
            name: "Vowel",
            patterns: [
                {pattern: "a", weight: 1.0},
                {pattern: "e", weight: 1.0},
                {pattern: "i", weight: 1.0},
                {pattern: "o", weight: 1.0},
                {pattern: "u", weight: 1.0},
            ]
        },
        {
            name: "Consonant",
            patterns: [
                {pattern: "p", weight: 1.0},
                {pattern: "t", weight: 1.0},
                {pattern: "k", weight: 1.0},
                {pattern: "s", weight: 1.0},
                {pattern: "m", weight: 1.0},
                {pattern: "n", weight: 1.0},
                {pattern: "l", weight: 1.0},
                {pattern: "w", weight: 1.0},
                {pattern: "j", weight: 1.0},
            ]
        },
        {
            name: "Coda",
            patterns: [
                {pattern: "n", weight: 1.0},
            ]
        },
    ]);
    const [rules, setRules] = useState([
        {
            name: "Initial",
            patterns: [
                {pattern: "Consonant.Vowel.Coda", weight: 1.0},
                {pattern: "Consonant.Vowel", weight: 1.0},
                {pattern: "Vowel.Coda", weight: 1.0},
                {pattern: "Vowel", weight: 1.0},
            ]
        },
        {
            name: "Syllable",
            patterns: [
                {pattern: "Consonant.Vowel.Coda", weight: 1.0},
                {pattern: "Consonant.Vowel", weight: 1.0},
            ]
        },
        {
            name: "Word",
            patterns: [
                {pattern: "Initial", weight: 1.0},
                {pattern: "Initial.Syllable", weight: 1.0},
                {pattern: "Initial.Syllable.Syllable", weight: 1.0},
            ]
        },
    ]);


    return (
        <>
            <Col className="bg-background md:w-1/2">
                <div className="bg-surface p-4">Configuration</div>

                <Col className="p-6 gap-4 overflow-auto no-scrollbar pb-64">

                    <Col className="bg-surface p-2 rounded gap-2">
                        <SwitchLabel checked={enableWeights} onChange={setEnableWeights}
                                     label="Enable probability weights"
                                     enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/20"/>
                        <SwitchLabel checked={enableSerif} onChange={setEnableSerif} label="Enable serifs"
                                     enabledColor="bg-primary" disabledColor="bg-primary/20"/>
                    </Col>


                    <Groups className="" groups={groups} onGroupsChange={setGroups} enableWeight={enableWeights}
                            enableSerif={enableSerif}/>

                    <Rules className="" rules={rules} onRulesChange={setRules} enableWeight={enableWeights}/>
                </Col>

            </Col>
        </>
    )
}