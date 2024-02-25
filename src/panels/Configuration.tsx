import {Col} from "../components/Col.tsx";
import {useState} from "react";
import {Rule, RuleInstance} from "./RuleInstance.tsx";
import {uid} from "uid";
import cloneDeep from "lodash.clonedeep";
import {Row} from "../components/Row.tsx";
import {closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import {arrayMove, SortableContext, verticalListSortingStrategy} from "@dnd-kit/sortable";

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

    const onRuleChangeIndex = (index: number) => {
        return (group: Rule) => {
            const newRules = cloneDeep(rules)
            newRules[index] = group
            setRules(newRules)
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {
            const newRules = cloneDeep(rules)
            newRules.splice(index, 1)
            setRules(newRules)
        }
    }

    const onRuleAdd = () => {
        setRules([...rules, {
            id: uid(),
            name: "",
            patterns: [],
            rewrites: [],
            exclusions: [],
            terminalOnly: false,
            showRewrites: false,
            showExclusions: false,
        }])
    }

    const onGroupAdd = () => {
        setRules([...rules, {
            id: uid(),
            name: "",
            patterns: [],
            rewrites: [],
            exclusions: [],
            terminalOnly: true,
            showRewrites: false,
            showExclusions: false,
        }])
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
    );

    const onRulePatternDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (active.id !== over?.id) {

            const oldIndex = rules.findIndex(it => it.id === active.id);
            const newIndex = rules.findIndex(it => it.id === over?.id);

            const newRules = arrayMove(rules, oldIndex, newIndex)
            setRules(newRules)
        }
    };

    return (
        <>
            <Col className="bg-background md:w-2/3">
                <div className="bg-surface p-4">Configuration</div>

                <Col className="p-6 gap-4 overflow-auto no-scrollbar pb-64">

                    <Col>
                        <Col className="gap-4">

                            <DndContext sensors={sensors} collisionDetection={closestCenter}
                                        onDragEnd={onRulePatternDragEnd}>
                                <SortableContext items={rules} strategy={verticalListSortingStrategy}>
                                    {rules.map((r, index) =>
                                        <RuleInstance rule={r}
                                                      onRuleChange={onRuleChangeIndex(index)}
                                                      onDelete={onRuleDeleteIndex(index)}
                                                      enableWeight={enableWeights}
                                                      enableSerif={enableSerif}/>)}
                                </SortableContext>
                            </DndContext>

                            <Row className="gap-4">
                                <button onClick={onGroupAdd} className="grow bg-primary rounded p-1">Add Group</button>
                                <button onClick={onRuleAdd} className="grow bg-secondary rounded p-1">Add Rule</button>
                            </Row>
                        </Col>

                    </Col>

                </Col>

            </Col>
        </>
    )
}