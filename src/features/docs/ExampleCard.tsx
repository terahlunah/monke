import {ReactNode} from "react";
import {ChevronsRightIcon, ExternalLinkIcon} from "lucide-react";
import {ExampleRule, itemText, itemWeight, ReferenceExample} from "./referenceExamples.ts";

// Read-only rendition of the editor's rule cards: same colours and chip shapes, but plain text with no controls,
// so screen readers get lists of real text instead of dozens of inputs.

const Chip = ({children}: { children: ReactNode }) => (
    <li className="flex flex-row min-h-8 items-stretch rounded-sm overflow-clip">{children}</li>
)

const Cell = ({className, children}: { className: string, children: ReactNode }) => (
    <span className={`${className} px-2 flex items-center [overflow-wrap:anywhere] whitespace-pre-wrap`}>{children}</span>
)

const SectionTitle = ({children}: { children: string }) => (
    <div className="flex flex-row items-baseline justify-between gap-4">
        <h4>{children}</h4>
        <div className="h-0.5 bg-white/10 grow" aria-hidden="true"/>
    </div>
)

const chipList = "flex flex-row flex-wrap gap-2"

const RuleCard = ({rule, weights}: { rule: ExampleRule, weights: boolean }) => {
    const tone = rule.terminal ? "bg-primary/40" : "bg-secondary/40"
    const patternsLabel = rule.terminal ? "Terminals" : "Patterns"
    return (
        <li className="flex flex-col rounded-sm bg-surface p-2 gap-2">
            <div className="flex flex-row flex-wrap items-center gap-2">
                <span className="sr-only">Rule</span>
                <span className={`${tone} rounded-sm text-lg px-3 py-1 [overflow-wrap:anywhere]`}>{rule.name}</span>
                {rule.rewrites?.length ? <span className="rounded-sm bg-accent-warning px-2" aria-hidden="true">Rw</span> : null}
                {rule.exclusions?.length ? <span className="rounded-sm bg-accent-caution px-2" aria-hidden="true">Ex</span> : null}
            </div>
            <SectionTitle>{patternsLabel}</SectionTitle>
            <ul aria-label={`${patternsLabel} of rule ${rule.name}`} className={chipList}>
                {rule.items.map((item, i) => {
                    const weight = weights ? itemWeight(item) : null
                    return (
                        <Chip key={i}>
                            <Cell className={tone}>{itemText(item)}</Cell>
                            {weight !== null ?
                                <Cell className="bg-accent-warning/40"><span className="sr-only">weight </span>{weight}</Cell> : null}
                        </Chip>
                    )
                })}
            </ul>
            {rule.rewrites?.length ? (
                <>
                    <SectionTitle>Rewrites</SectionTitle>
                    <ul aria-label={`Rewrites of rule ${rule.name}`} className={chipList}>
                        {rule.rewrites.map(([match, replace], i) => (
                            <Chip key={i}>
                                <Cell className="bg-accent-warning/40">{match}</Cell>
                                <span className="bg-accent-warning px-1 flex items-center">
                                    <ChevronsRightIcon className="size-4" aria-hidden="true"/>
                                    <span className="sr-only">becomes</span>
                                </span>
                                <Cell className="bg-accent-warning/40">{replace}</Cell>
                            </Chip>
                        ))}
                    </ul>
                </>
            ) : null}
            {rule.exclusions?.length ? (
                <>
                    <SectionTitle>Exclusions</SectionTitle>
                    <ul aria-label={`Exclusions of rule ${rule.name}`} className={chipList}>
                        {rule.exclusions.map((e, i) => <Chip key={i}><Cell className="bg-accent-caution/20">{e}</Cell></Chip>)}
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
    const linkClass = "bg-primary rounded-sm px-3 py-1 inline-flex items-center gap-1.5"
    return (
        <figure className="rounded-sm bg-white/5 p-4 flex flex-col gap-3">
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
            <p className="text-sm text-on-surface/80">
                Start rule <code className="font-mono rounded-sm bg-white/10 px-1.5 py-0.5">{example.root}</code>
                {example.weights ? ", weights enabled" : null}
            </p>
            <ul aria-label={`Rules of ${example.title}`} className="flex flex-col gap-2">
                {example.rules.map(r => <RuleCard key={r.name} rule={r} weights={example.weights ?? false}/>)}
            </ul>
        </figure>
    )
}
