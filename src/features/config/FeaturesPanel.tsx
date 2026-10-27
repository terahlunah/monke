import {Dispatch, useState} from "react";
import AutowidthInput from "react-autowidth-input";
import {SquareMinusIcon, SquarePlusIcon, XIcon} from "lucide-react";
import {Feature, FeatureValue} from "@/engine/config.ts";
import {ConfigAction} from "@/engine/configReducer.ts";
import {useInvalidProps} from "./grammarError.ts";
import {InlineGrammarError} from "./InlineGrammarError.tsx";
import {AddButton, RowDeleteButton} from "./ruleParts.tsx";

type FeaturesPanelProps = {
    features: Feature[]
    dispatch: Dispatch<ConfigAction>
    enableWeights: boolean
}

// Declared features and their values. Removing one also untags every item; browser Back undoes it, so no confirmation.
export const FeaturesPanel = ({features, dispatch, enableWeights}: FeaturesPanelProps) => {
    // A viewer preference like a rule's disclosure, but not part of the grammar, so it is not shared.
    const [open, setOpen] = useState(true)
    return (
        <section aria-labelledby="features-heading" className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-2 md:px-3">
            <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
                        aria-label="Details of phonological features"
                        className="flex size-[30px] items-center justify-center rounded-md text-muted hover:bg-white/10">
                    {open ? <SquareMinusIcon className="size-5" aria-hidden="true"/> : <SquarePlusIcon className="size-5" aria-hidden="true"/>}
                </button>
                <h3 id="features-heading" className="text-[15px] font-semibold">Phonological features</h3>
                <span className="text-[13px] text-subtle">{features.length || "none"}</span>
                <div className="flex-1"/>
                <AddButton tone="text-primary-text" label="Add feature" onClick={() => {
                    setOpen(true)
                    dispatch({type: "addFeature"})
                }}>Feature</AddButton>
            </div>
            {!open ? null : features.length === 0 ? (
                <p className="px-1 pb-1 text-sm text-muted">
                    Values like front or back that items carry. A rule that chooses a feature keeps one value for everything inside it.
                </p>
            ) : (
                <div className="flex flex-col pb-1">
                    {features.map((f, index) =>
                        <FeatureRow key={f.id} feature={f} index={index} dispatch={dispatch} enableWeights={enableWeights}/>)}
                </div>
            )}
        </section>
    )
}

type FeatureRowProps = {
    feature: Feature
    index: number
    dispatch: Dispatch<ConfigAction>
    enableWeights: boolean
}

const FeatureRow = ({feature, index, dispatch, enableWeights}: FeatureRowProps) => {
    const featureId = feature.id
    const invalid = useInvalidProps(featureId)
    const name = feature.name || `${index + 1}`
    return (
        <div role="group" aria-label={`Feature ${name}`} className="flex flex-col gap-1 border-t border-line-row py-1.5 first:border-t-0">
            <div className="flex flex-wrap items-center gap-1.5">
                <AutowidthInput value={feature.name} aria-label={`Name of feature ${index + 1}`} {...invalid}
                                onChange={e => dispatch({type: "renameFeature", featureId, name: e.currentTarget.value})}
                                minWidth={84} spellCheck={false} placeholder="name"
                                className="h-9 md:h-8 rounded-md border border-line-strong bg-background px-2.5 font-mono text-sm font-medium outline-0 placeholder:text-subtle"/>
                {feature.values.map((v, i) =>
                    <ValueBox key={v.id} value={v} index={i} feature={feature} featureName={name} dispatch={dispatch} enableWeights={enableWeights}/>)}
                <AddButton tone="text-primary-text" label={`Add a value to feature ${name}`}
                           onClick={() => dispatch({type: "addFeatureValue", featureId})}>value</AddButton>
                <div className="flex-1"/>
                <RowDeleteButton label={`Delete feature ${name}`} onClick={() => dispatch({type: "removeFeature", featureId})}/>
            </div>
            <InlineGrammarError ruleId={featureId} itemIds={[null, ...feature.values.map(v => v.id)]}/>
        </div>
    )
}

type ValueBoxProps = {
    value: FeatureValue
    index: number
    feature: Feature
    featureName: string
    dispatch: Dispatch<ConfigAction>
    enableWeights: boolean
}

// `front ×1`: the name, and the weight when weights are on, in one lime outlined box with its delete button.
const ValueBox = ({value, index, feature, featureName, dispatch, enableWeights}: ValueBoxProps) => {
    const invalid = useInvalidProps(feature.id, value.id)
    const [weight, setWeight] = useState(String(value.weight))
    const [synced, setSynced] = useState(value.weight)
    if (synced !== value.weight) {
        setSynced(value.weight)
        setWeight(String(value.weight))
    }
    const valueName = value.name || `${index + 1}`
    const commitWeight = () => {
        const n = Number(weight)
        if (weight.trim() !== "" && Number.isFinite(n) && n >= 0) dispatch({type: "setFeatureValueWeight", featureId: feature.id, valueId: value.id, weight: n})
        else setWeight(String(value.weight))
    }
    return (
        <span className="inline-flex h-9 md:h-8 items-center rounded-md border border-feature-line pl-1 font-mono text-[13px] text-feature">
            <AutowidthInput value={value.name} aria-label={`Value ${index + 1} of feature ${featureName}`} {...invalid}
                            onChange={e => dispatch({type: "renameFeatureValue", featureId: feature.id, valueId: value.id, name: e.currentTarget.value})}
                            minWidth={40} spellCheck={false} placeholder="value"
                            className="h-7 md:h-6 rounded bg-transparent px-1 text-feature outline-0 placeholder:text-subtle"/>
            {enableWeights ? (
                <span className="flex items-center text-feature-dim">
                    <span aria-hidden="true">×</span>
                    <AutowidthInput value={weight} aria-label={`Weight of value ${valueName} of feature ${featureName}`}
                                    onChange={e => setWeight(e.currentTarget.value)} onBlur={commitWeight}
                                    inputMode="decimal" minWidth={16}
                                    className="h-7 md:h-6 rounded bg-transparent px-0.5 text-feature-dim outline-0"/>
                </span>
            ) : null}
            <button type="button" onClick={() => dispatch({type: "removeFeatureValue", featureId: feature.id, valueId: value.id})}
                    aria-label={`Delete value ${valueName} of feature ${featureName}`}
                    className="ml-0.5 flex h-full w-7 md:w-6 items-center justify-center rounded-r-md text-feature-dim hover:bg-white/10">
                <XIcon className="size-3.5" aria-hidden="true"/>
            </button>
        </span>
    )
}
