import {GenericProps} from "./GenericProps.tsx";
import {Row} from "./Row.tsx";
import {PlusIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent, useEffect, useState} from "react";
import {Col} from "./Col.tsx";
import cloneDeep from "lodash.clonedeep"

type Group = {
    name: string,
    patterns: GroupPattern[]
}

type GroupPattern = {
    pattern: string,
    weight: number
}

type GroupsProps = {
    groups: Group[]
    onGroupsChange: (groups: Group[]) => void
    enableWeight?: boolean
    enableSerif?: boolean
}

export const Groups = (
    {
        className,
        groups,
        onGroupsChange,
        enableWeight,
        enableSerif
    }: GenericProps<GroupsProps>) => {

    const onGroupChangeIndex = (index: number) => {
        return (group: Group) => {
            const newGroups = cloneDeep(groups)
            newGroups[index] = group
            onGroupsChange(newGroups)
        }
    }

    const onGroupDeleteIndex = (index: number) => {
        return () => {
            const newGroups = cloneDeep(groups)
            newGroups.splice(index, 1)
            onGroupsChange(newGroups)
        }
    }

    const onAddGroup = () => {
        onGroupsChange([...groups, {name: "", patterns: []}])
    }


    return (
        <Col className={`${className}`}>
            <Row className="items-center gap-4">
                <h1 className="pb-4 text-3xl">Groups</h1>
                <hr className="grow h-0.5 border-t-0 bg-primary"/>
            </Row>
            <Col className="gap-2">
                {groups.map((g, index) =>
                    <GroupItem group={g}
                               onGroupChange={onGroupChangeIndex(index)}
                               onDelete={onGroupDeleteIndex(index)}
                               enableWeight={enableWeight}
                               enableSerif={enableSerif}/>)}
                <button onClick={onAddGroup} className="bg-primary rounded p-1">Add Group</button>
            </Col>

        </Col>
    )
}

type GroupItemProps = {
    group: Group
    onGroupChange: (group: Group) => void
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
}

const GroupItem = ({
                       className,
                       group,
                       onGroupChange,
                       onDelete,
                       enableWeight,
                       enableSerif
                   }: GenericProps<GroupItemProps>) => {


    const onGroupNameInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onGroupChange({...group, name: v});
    }

    const onPatternChangeIndex = (index: number) => {
        return (pattern: GroupPattern) => {
            const newGroup = cloneDeep(group)
            newGroup.patterns[index] = pattern
            onGroupChange(newGroup)
        }
    }

    const onDeletePatternIndex = (index: number) => {
        return () => {
            const newGroup = cloneDeep(group)
            newGroup.patterns.splice(index, 1)
            onGroupChange(newGroup)
        }
    }

    const onAddPattern = () => {
        const newGroup = cloneDeep(group)
        newGroup.patterns.push({pattern: "", weight: 1.0})
        onGroupChange(newGroup)
    }

    return (
        <Col className={`${className} rounded bg-surface p-2 gap-2`}>
            <Row className="items-center justify-between">
                <div className="rounded overflow-clip">
                    <AutowidthInput value={group.name} onInput={onGroupNameInput}
                                    className="bg-primary/40 text-center h-10 outline-0 px-4 text-lg"/>
                </div>
                <button onClick={onDelete} className="bg-accent-danger rounded p-1">
                    <XMarkIcon className="h-4"/>
                </button>
            </Row>
            <hr className="h-0.5 border-t-0 bg-white/10"/>
            <Row className="gap-4 flex-wrap">
                {group.patterns.map((p, index) =>
                    <GroupPattern pattern={p}
                                  onPatternChange={onPatternChangeIndex(index)}
                                  onDelete={onDeletePatternIndex(index)}
                                  enableWeight={enableWeight}
                                  enableSerif={enableSerif}/>
                )}
                <button onClick={onAddPattern} className="bg-primary mr-4 rounded p-1">
                    <PlusIcon className="h-6"/>
                </button>
            </Row>
        </Col>
    )
}

type GroupPatternProps = {
    pattern: GroupPattern
    onPatternChange: (value: GroupPattern) => void
    onDelete?: () => void
    enableWeight?: boolean
    enableSerif?: boolean
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
                          enableSerif,
                      }: GenericProps<GroupPatternProps>) => {

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
            <button onClick={onDelete} className="bg-primary p-1 h-8"><XMarkIcon className="h-4"/></button>
            <AutowidthInput value={pattern.pattern}
                            onChange={onGroupInput}
                            className={`bg-primary/40 px-1 outline-0 text-center h-8 ${enableSerif ? "font-serif" : ""}`}
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