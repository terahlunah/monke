import {Row} from "../components/Row.tsx";
import {ChevronDownIcon, ChevronUpIcon, CopyIcon, EllipsisVerticalIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {FormEvent} from "react";
import {Col} from "../components/Col.tsx";
import {ToggleLabel} from "../components/ToggleLabel.tsx";
import {SortableRow} from "../components/SortableList.tsx";
import {Rule} from "../engine/config.ts";
import {RuleSection} from "./RuleSection.tsx";
import {RewriteSection} from "./RewriteSection.tsx";
import {ExclusionSection} from "./ExclusionSection.tsx";


export type RuleInstanceProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    onDelete?: () => void
    enableWeights?: boolean
    enableSerif?: boolean
    onClone: () => void
}

export const RuleInstance = ({
                                 rule,
                                 onRuleChange,
                                 onDelete,
                                 enableWeights,
                                 enableSerif,
                                 onClone,
                             }: RuleInstanceProps) => {


    const onRuleNameInput = (e: FormEvent<HTMLInputElement>) => {
        const v = e.currentTarget.value;
        onRuleChange({...rule, name: v});
    }

    const onRuleToggleRewrites = (showRewrites: boolean) => {
        onRuleChange({...rule, showRewrites: showRewrites});
    }
    const onRuleToggleExclusions = (showExclusions: boolean) => {
        onRuleChange({...rule, showExclusions: showExclusions});
    }

    const onRuleToggleCollapse = () => {
        onRuleChange({...rule, collapsed: !rule.collapsed});
    }

    return (
        <SortableRow id={rule.id} draggingClassName="z-30 shadow-sm border-white/20 border">
            {({handleProps}) => (
            <Col className="rounded-sm bg-surface px-2 pb-2 gap-2">
                <Row className="items-center justify-between pt-2">
                    <Row className="items-center justify-start">
                        <div className="pl-2 pr-3 touch-none" {...handleProps} aria-label="Reorder rule">
                            <EllipsisVerticalIcon className="size-5"/>
                        </div>
                        <button onClick={onRuleToggleCollapse} className="border border-white/30 rounded-sm p-2 mr-2"
                                aria-label={rule.collapsed ? "Expand Rule" : "Collapse rule"}>
                            {
                                rule.collapsed ?
                                    <ChevronDownIcon className="size-5 stroke-[2.5]"/> :
                                    <ChevronUpIcon className="size-5 stroke-[2.5]"/>
                            }
                        </button>
                        <button onClick={onClone} className="border border-white/30 rounded-sm p-2"
                                aria-label="Duplicate rule">
                            <CopyIcon className="size-5"/>
                        </button>
                        <div className="rounded-sm overflow-clip mx-4">
                            <AutowidthInput value={rule.name} onInput={onRuleNameInput} aria-label="Rule name"
                                            className={`${rule.terminalOnly ? "bg-primary/40" : "bg-secondary/40"} text-center h-10 outline-0 px-4 text-lg`}/>
                        </div>
                        {
                            !rule.terminalOnly ?
                                <>
                                    <div className="w-0.5 h-8 bg-white/10"/>
                                    <Row className="gap-2 items-center">
                                        <ToggleLabel label="Rw" checked={rule.showRewrites}
                                                     onChange={onRuleToggleRewrites}
                                                     enabledColor="bg-accent-warning"
                                                     disabledColor="bg-accent-warning/20"/>
                                        <ToggleLabel label="Ex" checked={rule.showExclusions}
                                                     onChange={onRuleToggleExclusions}
                                                     enabledColor="bg-accent-caution"
                                                     disabledColor="bg-accent-caution/20"/>
                                    </Row>
                                </>
                                : null
                        }
                    </Row>
                    <button onClick={onDelete} className="bg-accent-danger/50 rounded-sm p-1" aria-label="Delete rule">
                        <XIcon className="size-5"/>
                    </button>
                </Row>
                {
                    rule.collapsed ? <></> :
                        <>
                            <Row className="items-baseline justify-between gap-4">
                                <div>{rule.terminalOnly ? "Terminals" : "Patterns"}</div>
                                <div className="h-0.5 bg-white/10 grow"/>
                            </Row>
                            <RuleSection rule={rule} onRuleChange={onRuleChange} enableSerif={enableSerif}
                                         enableWeights={enableWeights}/>
                            {rule.showRewrites && !rule.terminalOnly ? (
                                <RewriteSection rule={rule} onRuleChange={onRuleChange} enableSerif={enableSerif}/>
                            ) : null
                            }
                            {rule.showExclusions && !rule.terminalOnly ? (
                                <ExclusionSection rule={rule} onRuleChange={onRuleChange} enableSerif={enableSerif}/>
                            ) : null
                            }
                        </>
                }
            </Col>
            )}
        </SortableRow>
    )
}

