import {GenericProps} from "./GenericProps.tsx";
import {Row} from "./Row.tsx";
import {PlusIcon, TrashIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent, useEffect, useState} from "react";
import {Col} from "./Col.tsx";
import cloneDeep from "lodash.clonedeep"

type Rule = {
    name: string,
    patterns: RulePattern[]
}

type RulePattern = {
    pattern: string,
    weight: number
}

type RulesProps = {
    rules: Rule[]
    onRulesChange: (groups: Rule[]) => void
    enableWeight?: boolean
}

export const Rules = (
    {
        className,
        rules,
        onRulesChange,
        enableWeight,
    }: GenericProps<RulesProps>) => {

    const onRuleChangeIndex = (index: number) => {
        return (group: Rule) => {
            const newRules = cloneDeep(rules)
            newRules[index] = group
            onRulesChange(newRules)
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {
            const newRules = cloneDeep(rules)
            newRules.splice(index, 1)
            onRulesChange(newRules)
        }
    }

    const onRuleAdd = () => {
        onRulesChange([...rules, {name: "", patterns: []}])
    }


    return (
        <Col className={`${className}`}>
            <Row className="items-center gap-4">
                <h1 className="pb-4 text-3xl">Rules</h1>
                <hr className="grow h-0.5 border-t-0 bg-secondary"/>
            </Row>
            <Col className="gap-2">
                {rules.map((r, index) =>
                    <GroupItem rule={r}
                               onRuleChange={onRuleChangeIndex(index)}
                               onDelete={onRuleDeleteIndex(index)}
                               enableWeight={enableWeight}/>)}
                <button onClick={onRuleAdd} className="bg-secondary rounded p-1">Add Group</button>
            </Col>

        </Col>
    )
}

type RuleItemProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
}

const GroupItem = ({
                       className,
                       rule,
                       onRuleChange,
                       onDelete,
                       enableWeight,
                   }: GenericProps<RuleItemProps>) => {


    const onRuleNameInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onRuleChange({...rule, name: v});
    }

    const onRuleChangeIndex = (index: number) => {
        return (pattern: RulePattern) => {
            const newRule = cloneDeep(rule)
            newRule.patterns[index] = pattern
            onRuleChange(newRule)
        }
    }

    const onRuleDeleteIndex = (index: number) => {
        return () => {
            const newRule = cloneDeep(rule)
            newRule.patterns.splice(index, 1)
            onRuleChange(newRule)
        }
    }

    const onAddRule = () => {
        const newRule = cloneDeep(rule)
        newRule.patterns.push({pattern: "", weight: 1.0})
        onRuleChange(newRule)
    }

    return (
        <Col className={`${className} rounded bg-surface p-2 gap-2`}>
            <Row className="items-center justify-between">
                <div className="rounded overflow-clip">
                    <AutowidthInput value={rule.name} onInput={onRuleNameInput}
                                    className="bg-secondary/40 text-center h-10 outline-0 px-4 text-lg"/>
                </div>
                <button onClick={onDelete} className="bg-accent-danger rounded p-1">
                    <TrashIcon className="h-4"/>
                </button>
            </Row>
            <hr className="h-0.5 border-t-0 bg-white/10"/>
            <Row className="gap-4 flex-wrap">
                {rule.patterns.map((p, index) =>
                    <GroupPattern pattern={p}
                                  onPatternChange={onRuleChangeIndex(index)}
                                  onDelete={onRuleDeleteIndex(index)}
                                  enableWeight={enableWeight}/>
                )}
                <button onClick={onAddRule} className="bg-secondary mr-4 rounded p-1">
                    <PlusIcon className="h-6"/>
                </button>
            </Row>
        </Col>
    )
}

type RulePatternProps = {
    pattern: RulePattern
    onPatternChange: (value: RulePattern) => void
    onDelete?: () => void
    enableWeight?: boolean
}

function isNumber(value?: string | number): boolean {
    return ((value != null) &&
        (value !== '') &&
        !isNaN(Number(value.toString())));
}

const GroupPattern = ({
                          className,
                          pattern,
                          onPatternChange,
                          onDelete,
                          enableWeight,
                      }: GenericProps<RulePatternProps>) => {

    const [weightValue, setWeightValue] = useState(pattern.weight.toString())

    useEffect(() => {
        setWeightValue(pattern.weight.toString())
    }, [pattern]);

    const onGroupInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        onPatternChange({...pattern, pattern: v})
    }

    const onWeightInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        setWeightValue(v)
    }

    const onWeightBlur = () => {
        if (isNumber(weightValue)) {
            onPatternChange({...pattern, weight: +weightValue})
        } else {
            setWeightValue('1')
        }
    }

    return (
        <Row className={`${className} rounded overflow-clip w-min h-8 items-center`}>
            <button onClick={onDelete} className="bg-secondary p-1 h-8"><TrashIcon className="h-4"/></button>
            <AutowidthInput value={pattern.pattern}
                            onChange={onGroupInput}
                            className={`bg-secondary/40 px-1 outline-0 text-center h-8`}
                            type="text"
                            minWidth={15}/>
            {enableWeight ? (
                <AutowidthInput value={weightValue}
                                onInput={onWeightInput}
                                onBlur={onWeightBlur}
                                className="bg-accent-warning/40 px-1 outline-0 text-center h-8"
                                type="text"
                                minWidth={10}/>
            ) : null
            }

        </Row>
    );
}