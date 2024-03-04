import {GenericProps} from "../components/GenericProps.tsx";
import {Row} from "../components/Row.tsx";
import {EllipsisVerticalIcon, XMarkIcon} from "@heroicons/react/24/outline";
import AutowidthInput from "react-autowidth-input";
import {ChangeEvent} from "react";
import {Col} from "../components/Col.tsx";
import {ToggleLabel} from "../components/ToggleLabel.tsx";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {Rule} from "../models/ui.ts";
import {RuleSection} from "./RuleSection.tsx";
import {RewriteSection} from "./RewriteSection.tsx";
import {ExclusionSection} from "./ExclusionSection.tsx";


export type RuleInstanceProps = {
    rule: Rule
    onRuleChange: (rule: Rule) => void
    onDelete?: () => void
    enableWeights?: boolean
    enableSerif?: boolean
}

export const RuleInstance = ({
                                 className,
                                 rule,
                                 onRuleChange,
                                 onDelete,
                                 enableWeights,
                                 enableSerif,
                             }: GenericProps<RuleInstanceProps>) => {


    const onRuleNameInput = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onRuleChange({...rule, name: v});
    }

    const onRuleToggleRewrites = (showRewrites: boolean) => {
        onRuleChange({...rule, showRewrites: showRewrites});
    }
    const onRuleToggleExclusions = (showExclusions: boolean) => {
        onRuleChange({...rule, showExclusions: showExclusions});
    }

    const {
        listeners,
        setNodeRef,
        transform,
        transition,
        attributes,
        isDragging,
    } = useSortable({id: rule.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} key={rule.id} id={rule.id}
             className={`${isDragging ? "z-30 shadow border-white/20 border-2" : ""}`}>
            <Col className={`${className} rounded bg-surface px-2 pb-2 gap-2`}>
                <Row className="items-center justify-between pt-2">
                    <Row className="items-center justify-start">
                        <div className="p-2 touch-none" {...listeners} {...attributes}>
                            <EllipsisVerticalIcon className="h-5"/>
                        </div>
                        <div className="rounded overflow-clip mr-4">
                            <AutowidthInput value={rule.name} onInput={onRuleNameInput}
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
                    <button onClick={onDelete} className="bg-accent-danger/50 rounded p-1">
                        <XMarkIcon className="h-5"/>
                    </button>
                </Row>
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
            </Col>
        </div>
    )
}

