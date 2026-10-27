import {Fragment} from "react";
import {formatReleaseDate, Release, releaseAnchor} from "./releases.ts";

// Shared by the /news/ page (prerendered), the Atom feed and the in-app panel, so everything renders without effects.

const REPO_URL = "https://github.com/terahlunah/monke"
const linkClass = "text-primary-text underline"
const codeClass = "font-mono rounded-sm bg-white/10 px-1.5 py-0.5 whitespace-pre-wrap"

// Release items are plain strings: `code` spans become <code>, and (#N) becomes a link to that GitHub issue.
export const ReleaseText = ({text, newTab = false}: { text: string, newTab?: boolean }) => (
    <>
        {text.split(/(`[^`]+`|\(#\d+\))/).map((part, i) => {
            if (part.startsWith("`")) return <code key={i} className={codeClass}>{part.slice(1, -1)}</code>
            const issue = part.match(/^\(#(\d+)\)$/)
            if (!issue) return <Fragment key={i}>{part}</Fragment>
            return <Fragment key={i}>(<a className={linkClass} href={`${REPO_URL}/issues/${issue[1]}`}
                                          {...(newTab ? {target: "_blank", rel: "noreferrer noopener"} : {})}>
                #{issue[1]}{newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}</a>)</Fragment>
        })}
    </>
)

type BodyProps = {
    release: Release
    // Section titles use this heading level.
    level: 3 | 4
    newTab?: boolean
}

// The summary and sections without the heading, which a feed entry supplies as its title.
export const ReleaseBody = ({release, level, newTab}: BodyProps) => {
    const Sub = `h${level}` as "h3" | "h4"
    return (
        <>
            {release.summary ? <p>{release.summary}</p> : null}
            {release.sections.map(section => (
                <section key={section.title} className="flex flex-col gap-1.5">
                    <Sub className="font-semibold text-muted">{section.title}</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-1.5">
                        {section.items.map((item, i) => <li key={i}><ReleaseText text={item} newTab={newTab}/></li>)}
                    </ul>
                </section>
            ))}
        </>
    )
}

type Props = {
    release: Release
    // The release heading is this level; section titles are one level below.
    level: 2 | 3
    newTab?: boolean
    // Only the /news/ page is the target of the feed's links.
    anchor?: boolean
}

export const ReleaseArticle = ({release, level, newTab, anchor}: Props) => {
    const H = `h${level}` as "h2" | "h3"
    return (
        <article id={anchor ? releaseAnchor(release) : undefined} className="flex flex-col gap-3 scroll-mt-4">
            <header className="flex flex-col gap-1">
                <H className="font-bold text-2xl">v{release.version}</H>
                <p className="text-muted"><time dateTime={release.date}>{formatReleaseDate(release.date)}</time></p>
            </header>
            <ReleaseBody release={release} level={(level + 1) as 3 | 4} newTab={newTab}/>
        </article>
    )
}
