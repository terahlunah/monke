import {Row} from "@/components/Row.tsx";
import {CopyIcon, SquareMinusIcon, SquarePlusIcon, EllipsisVerticalIcon, XIcon} from "lucide-react";
import AutowidthInput from "react-autowidth-input";
import {Dispatch, FormEvent} from "react";
import {Col} from "@/components/Col.tsx";
import {ToggleLabel} from "@/components/ToggleLabel.tsx";
import {SortableRow} from "@/components/SortableList.tsx";
import {MoveButtons} from "@/components/MoveButtons.tsx";
import {Rule} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
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
            <Col className="group/rule rounded-sm bg-surface px-2 pb-2 gap-2">
                <h3 className="sr-only">Rule {rule.name}</h3>
                {/* Identity on the left (handle, disclosure, name, filters), actions on the right with delete set apart at the end. */}
                <Row className="flex-wrap items-center justify-between gap-y-2 pt-2">
                    <Row className="items-center justify-start">
                        <div className="pr-0.5 md:pl-2 md:pr-2 touch-none" {...handleProps} aria-label={`Reorder rule ${rule.name}`}>
                            <EllipsisVerticalIcon className="size-5"/>
                        </div>
                        <button onClick={() => dispatch({type: "toggleCollapse", ruleId})} className="rounded-sm p-1 hover:bg-white/10"
                                aria-expanded={!rule.collapsed} aria-label={`Details of rule ${rule.name}`}>
                            {
                                rule.collapsed ?
                                    <SquarePlusIcon className="size-5"/> :
                                    <SquareMinusIcon className="size-5"/>
                            }
                        </button>
                        <div className="rounded-sm overflow-clip mx-1.5 md:mx-3">
                            <AutowidthInput value={rule.name} onInput={onRuleNameInput} aria-label="Rule name" {...invalid}
                                            className={`${rule.terminalOnly ? "bg-primary/40" : "bg-secondary/40"} text-center h-10 outline-0 px-2 md:px-4 text-lg`}/>
                        </div>
                        {
                            !rule.terminalOnly ?
                                <>
                                    <div className="w-0.5 h-8 bg-white/10 mr-1.5 md:mr-2"/>
                                    <Row className="gap-1.5 md:gap-2 items-center">
                                        <ToggleLabel label="Rw" accessibleName={`Rw, rewrites of rule ${rule.name}`} checked={rule.showRewrites}
                                                     onChange={show => dispatch({type: "setShowRewrites", ruleId, show})}
                                                     enabledColor="bg-accent-warning"
                                                     disabledColor="bg-accent-warning/20"/>
                                        <ToggleLabel label="Ex" accessibleName={`Ex, exclusions of rule ${rule.name}`} checked={rule.showExclusions}
                                                     onChange={show => dispatch({type: "setShowExclusions", ruleId, show})}
                                                     enabledColor="bg-accent-caution"
                                                     disabledColor="bg-accent-caution/20"/>
                                    </Row>
                                </>
                                : null
                        }
                    </Row>
                    <Row className="items-center md:gap-1 ml-auto">
                        <MoveButtons label={`rule ${rule.name || index + 1}`} index={index} total={total} onMove={onMove}
                                     orientation="vertical" scope="rule"
                                     buttonClassName="rounded-sm p-1 md:p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                                     iconClassName="size-5"/>
                        <button onClick={() => dispatch({type: "duplicateRule", ruleId})} className="rounded-sm p-1 md:p-1.5 hover:bg-white/10"
                                aria-label={`Duplicate rule ${rule.name}`}>
                            <CopyIcon className="size-5"/>
                        </button>
                        <div className="w-0.5 h-6 bg-white/10 mx-1 md:mx-2"/>
                        <button onClick={() => dispatch({type: "removeRule", ruleId})} className="bg-accent-danger/50 rounded-sm p-1" aria-label={`Delete rule ${rule.name}`}>
                            <XIcon className="size-5"/>
                        </button>
                    </Row>
                </Row>
                {/* A collapsed rule hides its items, so their errors show under the header instead. */}
                <InlineGrammarError ruleId={ruleId}
                                    itemIds={[null, ...(rule.collapsed ? [...rule.patterns, ...rule.rewrites, ...rule.exclusions].map(p => p.id) : [])]}/>
                {
                    rule.collapsed ? <></> :
                        <>
                            <Row className="items-baseline justify-between gap-4">
                                <h4>{rule.terminalOnly ? "Terminals" : "Patterns"}</h4>
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

