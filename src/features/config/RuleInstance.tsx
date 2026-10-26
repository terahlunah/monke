import {Row} from "@/components/Row.tsx";
import {ChevronDownIcon, ChevronUpIcon, CopyIcon, EllipsisVerticalIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {Dispatch, FormEvent} from "react";
import {Col} from "@/components/Col.tsx";
import {ToggleLabel} from "@/components/ToggleLabel.tsx";
import {SortableRow} from "@/components/SortableList.tsx";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {useInvalidProps} from "./grammarError.ts";
import {RuleSection} from "./RuleSection.tsx";
import {RewriteSection} from "./RewriteSection.tsx";
import {ExclusionSection} from "./ExclusionSection.tsx";


export type RuleInstanceProps = {
    index: number
    total: number
    onMove: (to: number) => void
    rule: Rule
    dispatch: Dispatch<ConfigAction>
    enableWeights?: boolean
    enableSerif?: boolean
}

export const RuleInstance = ({
                                 rule,
                                 index,
                                 total,
                                 onMove,
                                 dispatch,
                                 enableWeights,
                                 enableSerif,
                             }: RuleInstanceProps) => {

    const ruleId = rule.id
    const invalid = useInvalidProps(ruleId)

    const onRuleNameInput = (e: FormEvent<HTMLInputElement>) => {
        dispatch({type: "renameRule", ruleId, name: e.currentTarget.value});
    }

    return (
        <SortableRow id={rule.id} draggingClassName="z-30 shadow-sm border-white/20 border">
            {({handleProps}) => (
            <Col className="rounded-sm bg-surface px-2 pb-2 gap-2">
                <Row className="items-center justify-between pt-2">
                    <Row className="items-center justify-start">
                        <div className="pl-1 pr-1 md:pl-2 md:pr-3 touch-none" {...handleProps} aria-label={`Reorder rule ${rule.name}`}>
                            <EllipsisVerticalIcon className="size-5"/>
                        </div>
                        <div className="flex flex-col mr-1 md:mr-2 rounded-sm overflow-clip border border-white/30">
                            <MoveButtons label={`rule ${rule.name || index + 1}`} index={index} total={total} onMove={onMove}
                                         buttonClassName="px-1 h-5 disabled:opacity-40"
                                         iconClassName="size-4"/>
                        </div>
                        <button onClick={() => dispatch({type: "toggleCollapse", ruleId})} className="border border-white/30 rounded-sm p-2 mr-1 md:mr-2"
                                aria-label={rule.collapsed ? "Expand Rule" : "Collapse rule"}>
                            {
                                rule.collapsed ?
                                    <ChevronDownIcon className="size-5 stroke-[2.5]"/> :
                                    <ChevronUpIcon className="size-5 stroke-[2.5]"/>
                            }
                        </button>
                        <button onClick={() => dispatch({type: "duplicateRule", ruleId})} className="border border-white/30 rounded-sm p-2"
                                aria-label="Duplicate rule">
                            <CopyIcon className="size-5"/>
                        </button>
                        <div className="rounded-sm overflow-clip mx-2 md:mx-4">
                            <AutowidthInput value={rule.name} onInput={onRuleNameInput} aria-label="Rule name" {...invalid}
                                            className={`${rule.terminalOnly ? "bg-primary/40" : "bg-secondary/40"} text-center h-10 outline-0 px-3 md:px-4 text-lg`}/>
                        </div>
                        {
                            !rule.terminalOnly ?
                                <>
                                    <div className="w-0.5 h-8 bg-white/10"/>
                                    <Row className="gap-2 items-center">
                                        <ToggleLabel label="Rw" checked={rule.showRewrites}
                                                     onChange={show => dispatch({type: "setShowRewrites", ruleId, show})}
                                                     enabledColor="bg-accent-warning"
                                                     disabledColor="bg-accent-warning/20"/>
                                        <ToggleLabel label="Ex" checked={rule.showExclusions}
                                                     onChange={show => dispatch({type: "setShowExclusions", ruleId, show})}
                                                     enabledColor="bg-accent-caution"
                                                     disabledColor="bg-accent-caution/20"/>
                                    </Row>
                                </>
                                : null
                        }
                    </Row>
                    <button onClick={() => dispatch({type: "removeRule", ruleId})} className="bg-accent-danger/50 rounded-sm p-1" aria-label="Delete rule">
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
                            <RuleSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}
                                         enableWeights={enableWeights}/>
                            {rule.showRewrites && !rule.terminalOnly ? (
                                <RewriteSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}/>
                            ) : null
                            }
                            {rule.showExclusions && !rule.terminalOnly ? (
                                <ExclusionSection rule={rule} dispatch={dispatch} enableSerif={enableSerif}/>
                            ) : null
                            }
                        </>
                }
            </Col>
            )}
        </SortableRow>
    )
}

