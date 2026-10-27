import {ReactNode} from "react";
import {ChevronsRightIcon, ExternalLinkIcon} from "lucide-react";
import {ExampleRule, itemText, itemWeight, ReferenceExample} from "./referenceExamples.ts";

// Read-only rendition of the editor's rule cards: same colours and shapes, but plain text with no controls,
// so screen readers get lists of real text instead of dozens of inputs.

const Chip = ({children}: { children: ReactNode }) => (
    <li className="flex flex-row min-h-8 items-stretch overflow-clip rounded-md border border-line-strong bg-background font-mono">{children}</li>
)

const Cell = ({className = "", children}: { className?: string, children: ReactNode }) => (
    <span className={`${className} px-2.5 flex items-center [overflow-wrap:anywhere] whitespace-pre-wrap`}>{children}</span>
)

const SectionTitle = ({tone, count, children}: { tone: string, count: number, children: string }) => (
    <h4 className={`mt-2 text-[13px] font-semibold ${tone}`}>
        {children} <span className="font-normal text-subtle">{count}</span>
    </h4>
)

const chipList = "flex flex-row flex-wrap gap-2"

const RuleCard = ({rule, weights}: { rule: ExampleRule, weights: boolean }) => {
    const patternsLabel = rule.terminal ? "Terminals" : "Patterns"
    return (
        <li className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface p-3">
            <div className="flex flex-row flex-wrap items-baseline gap-2">
                <span className="sr-only">Rule</span>
                <span className={`text-[15px] font-semibold [overflow-wrap:anywhere] ${rule.terminal ? "text-terminal" : "text-pattern"}`}>{rule.name}</span>
                <span className="text-[13px] text-subtle">{rule.terminal ? "terminal rule" : "pattern rule"}</span>
                {rule.values?.length ? <span className="font-mono text-[13px] text-feature"><span className="sr-only">values </span>[{rule.values.join(", ")}]</span> : null}
                {rule.chooses?.length ? (
                    <span className="text-[13px] text-muted">chooses <span className="font-mono text-feature">{rule.chooses.join(", ")}</span></span>
                ) : null}
            </div>
            <SectionTitle tone="text-muted" count={rule.items.length}>{patternsLabel}</SectionTitle>
            <ul aria-label={`${patternsLabel} of rule ${rule.name}`} className={chipList}>
                {rule.items.map((item, i) => {
                    const weight = weights ? itemWeight(item) : null
                    return (
                        <Chip key={i}>
                            <Cell>{itemText(item)}</Cell>
                            {weight !== null ?
                                <Cell className="border-l border-line-strong text-muted"><span className="sr-only">weight </span>{weight}</Cell> : null}
                            {rule.itemValues?.[i]?.length ?
                                <Cell className="border-l border-line-strong text-feature"><span className="sr-only">values </span>[{rule.itemValues[i]!.join(", ")}]</Cell> : null}
                        </Chip>
                    )
                })}
            </ul>
            {rule.rewrites?.length ? (
                <>
                    <SectionTitle tone="text-rewrite" count={rule.rewrites.length}>Rewrites</SectionTitle>
                    <ul aria-label={`Rewrites of rule ${rule.name}`} className={chipList}>
                        {rule.rewrites.map(([match, replace], i) => (
                            <Chip key={i}>
                                <Cell>{match}</Cell>
                                <span className="flex items-center px-1 text-muted">
                                    <ChevronsRightIcon className="size-4" aria-hidden="true"/>
                                    <span className="sr-only">becomes</span>
                                </span>
                                <Cell>{replace}</Cell>
                            </Chip>
                        ))}
                    </ul>
                </>
            ) : null}
            {rule.exclusions?.length ? (
                <>
                    <SectionTitle tone="text-exclusion" count={rule.exclusions.length}>Exclusions</SectionTitle>
                    <ul aria-label={`Exclusions of rule ${rule.name}`} className={chipList}>
                        {rule.exclusions.map((e, i) => <Chip key={i}><Cell>{e}</Cell></Chip>)}
                    </ul>
                </>
            ) : null}
        </li>
    )
}

export const ExampleCard = ({example, summary, hrefs}: {
    example: ReferenceExample,
    summary?: string,
    hrefs: Record<string, string>
}) => {
    const href = hrefs[example.id]
    const linkClass = "bg-primary text-white rounded-md px-3 py-1 inline-flex items-center gap-1.5 hover:bg-primary-hover"
    return (
        <figure className="rounded-lg border border-line bg-background p-4 flex flex-col gap-3">
            <figcaption className="flex flex-row flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-lg">{example.title}</h3>
                {/* An invisible placeholder of the same size holds the layout until the share URL is encoded. */}
                {href ?
                    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}
                       aria-label={`Try it: ${example.title} (opens in a new tab)`}>
                        Try it<ExternalLinkIcon className="size-4" aria-hidden="true"/>
                    </a> :
                    <span className={`${linkClass} invisible`} aria-hidden="true">
                        Try it<ExternalLinkIcon className="size-4"/>
                    </span>}
            </figcaption>
            {summary ? <p>{summary}</p> : null}
            <p className="text-sm text-muted">
                Start rule <code className="font-mono rounded-md bg-white/10 px-1.5 py-0.5">{example.root}</code>
                {example.weights ? ", weights enabled" : null}
            </p>
            {example.features?.length ? (
                <ul aria-label={`Features of ${example.title}`} className="flex flex-col gap-1.5">
                    {example.features.map(([name, values]) => (
                        <li key={name} className="flex flex-wrap items-center gap-1.5 font-mono text-[13px]">
                            <span className="mr-1 font-medium">{name}</span>
                            {values.map(v => (
                                <span key={itemText(v)} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-feature-line px-2 text-feature">
                                    {itemText(v)}{example.weights ? <span className="text-feature-dim"><span className="sr-only">weight </span><span aria-hidden="true">×</span>{itemWeight(v) ?? 1}</span> : null}
                                </span>
                            ))}
                        </li>
                    ))}
                </ul>
            ) : null}
            <ul aria-label={`Rules of ${example.title}`} className="flex flex-col gap-2">
                {example.rules.map(r => <RuleCard key={r.name} rule={r} weights={example.weights ?? false}/>)}
            </ul>
        </figure>
    )
}
