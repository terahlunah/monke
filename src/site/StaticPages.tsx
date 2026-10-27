import {ReactNode} from "react";
import {GithubIcon} from "@/components/GithubIcon.tsx";
import {ExampleCard} from "@/features/docs/ExampleCard.tsx";
import {FaqList} from "@/features/docs/Faq.tsx";
import {ReferenceContent} from "@/features/docs/Reference.tsx";
import {Code} from "@/features/docs/Code.tsx";
import {awkwordsRows} from "@/features/docs/awkwordsRows.tsx";
import {awkwordsExample} from "@/features/docs/referenceExamples.ts";
import {notFoundPage, StaticPage, staticPages} from "./pages.ts";
import {navLabel} from "./navLabel.ts";
import {ReleaseArticle} from "./ReleaseNotes.tsx";
import {releases} from "./releases.ts";
import {feedPath} from "./feed.ts";

// Prerendered at build time (see scripts/prerender.ts) and served without the app bundle, so crawlers and readers
// without JavaScript get the full text. Everything here must render without effects.

const linkClass = "text-primary-text underline"
const GITHUB_URL = "https://github.com/terahlunah/monke"

type ShellPage = { path: string, heading: string, description: string }

export const Shell = ({page, children}: { page: ShellPage, children: ReactNode }) => (
    <div className="flex flex-col min-h-screen bg-background text-on-surface">
        <a href="#content" className="absolute -top-20 left-2 z-50 rounded-md bg-primary text-white p-2 focus:top-2">
            Skip to content
        </a>
        <header className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 px-4 md:px-6 py-3 border-b border-line bg-surface">
            <a href="/" className="text-xl font-bold">Monke</a>
            <nav aria-label="Main" className="flex flex-row flex-wrap gap-1">
                <a href="/" className="rounded-md px-3 py-1.5 bg-primary text-white hover:bg-primary-hover">Open the generator</a>
                {staticPages.map(p => (
                    <a key={p.path} href={p.path} aria-current={p.path === page.path ? "page" : undefined}
                       className={`rounded-md px-3 py-1.5 ${p.path === page.path ? "bg-primary-soft text-primary-text font-semibold" : "hover:bg-white/5"}`}>
                        {navLabel[p.path]}
                    </a>
                ))}
            </nav>
            <div className="grow"/>
            <a href={GITHUB_URL} className="flex rounded-md hover:text-primary-text" aria-label="GitHub repository">
                <GithubIcon className="size-6"/>
            </a>
        </header>
        <main id="content" tabIndex={-1} className="flex flex-col grow p-4 md:p-8 gap-6 leading-relaxed outline-none">
            <div className="flex flex-col gap-3 max-w-3xl w-full mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold">{page.heading}</h1>
                <p className="text-lg text-muted">{page.description}</p>
            </div>
            {children}
        </main>
        <footer className="px-4 md:px-6 py-4 border-t border-line bg-surface text-muted">
            <p className="max-w-3xl mx-auto">Monke is a free, open-source word generator made by Terah. It runs in your
                browser; grammars live in the page address and are never stored on a server.</p>
            <p className="max-w-3xl mx-auto mt-2"><a className={linkClass} href={feedPath}>Atom feed of release notes</a></p>
        </footer>
    </div>
)

export const Prose = ({children}: { children: ReactNode }) => <div className="flex flex-col gap-3 max-w-3xl w-full mx-auto">{children}</div>
export const H2 = ({children}: { children: ReactNode }) => <h2 className="font-bold text-2xl mt-6">{children}</h2>

export const AwkwordsAlternative = ({hrefs}: { hrefs: Record<string, string> }) => (
    <Prose>
        <p>Awkwords is a pattern-based word generator that many conlangers learned word generation with. Its compact
            syntax (subpatterns named by capital letters, brackets, optionals, weights and filters) made it quick to sketch
            a phonology. Monke grew from the same idea, and keeps your Awkwords patterns usable.</p>

        <H2>Import an Awkwords pattern</H2>
        <p>Open the <a className={linkClass} href="/">generator</a>, choose <b>Import</b>, then <b>Awkwords</b>, and pick
            an <Code>.awkw</Code> file saved by Awkwords or paste a pattern. Subpatterns become rules, the main pattern
            becomes the root rule <Code>Word</Code>, and filters become exclusions. When something can't be translated
            exactly, the import says so in the output panel. The <a className={linkClass}
            href="/reference/#reference-awkwords">Reference</a> lists every note the import can show.</p>

        <H2>Syntax side by side</H2>
        <table className="w-full text-left border-collapse">
            <caption className="text-left pb-2">Awkwords syntax and its Monke equivalent</caption>
            <thead>
            <tr className="border-b border-white/20">
                <th scope="col" className="py-2 pr-3">Awkwords</th>
                <th scope="col" className="py-2">Monke</th>
            </tr>
            </thead>
            <tbody>
            {awkwordsRows.map(([awk, monke], i) => (
                <tr key={i} className="border-b border-white/10 align-top">
                    <th scope="row" className="py-2 pr-3 font-normal">{awk}</th>
                    <td className="py-2">{monke}</td>
                </tr>
            ))}
            </tbody>
        </table>

        <H2>Example</H2>
        <p>This pattern from the Awkwords help, <Code>{"[VV]t[VV]^aa^ii^uu"}</Code>, keeps the second pair of vowels from
            repeating a vowel. In Monke the filtered fragment gets its own rule with exclusions:</p>
        <ExampleCard hrefs={hrefs} example={awkwordsExample} summary={awkwordsExample.summary}/>

        <H2>What Monke adds</H2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
            <li>Rule names of any length, not only one capital letter.</li>
            <li>Repetition with <Code>{"{min:max}"}</Code>, and optionals with their own probability.</li>
            <li>Rewrites with back-references, for sound changes and allophony.</li>
            <li>Exclusions that match patterns, with word boundaries <Code>^</Code> and <Code>$</Code>.</li>
            <li>Decimal weights, a seed for repeatable word lists, and Generate all to list every possible word.</li>
            <li>Share links that hold the whole grammar, and browser Back and Forward as undo and redo.</li>
        </ul>

        <H2>Other tools worth knowing</H2>
        <table className="w-full text-left border-collapse">
            <caption className="text-left pb-2">Conlang tools and what each is for</caption>
            <thead>
            <tr className="border-b border-white/20">
                <th scope="col" className="py-2 pr-3">Tool</th>
                <th scope="col" className="py-2">Best for</th>
            </tr>
            </thead>
            <tbody>
            {[
                ["Lexifer", "Generating words from a phonology definition, with phoneme frequencies and clean-up rules."],
                ["Gen", "A classic web word generator using categories and syllable types."],
                ["Wrdz", "A word generator with a simpler interface; one of Monke's inspirations."],
                ["Vulgarlang", "Generating a whole language at once (grammar, dictionary, phonology) rather than words to your own rules."],
                ["Lexurgy", "Applying sound changes to words you already have. It complements a generator: generate protoforms in Monke, then evolve them."],
            ].map(([tool, use]) => (
                <tr key={tool} className="border-b border-white/10 align-top">
                    <th scope="row" className="py-2 pr-3">{tool}</th>
                    <td className="py-2">{use}</td>
                </tr>
            ))}
            </tbody>
        </table>
    </Prose>
)

export const News = () => (
    <Prose>
        {releases.map(release => <ReleaseArticle key={release.version} release={release} level={2} anchor/>)}
    </Prose>
)

export const NotFoundBody = () => (
    <Shell page={notFoundPage}>
        <Prose>
            <p><a className={linkClass} href="/">Open the generator</a> to start a new grammar, or read
                the <a className={linkClass} href="/reference/">Reference</a>.</p>
        </Prose>
    </Shell>
)

export const StaticPageBody =({page, hrefs}: { page: StaticPage, hrefs: Record<string, string> }) => (
    <Shell page={page}>
        {page.path === "/reference/" ? <ReferenceContent hrefs={hrefs}/> : null}
        {page.path === "/faq/" ? <div className="flex flex-col gap-10"><FaqList/></div> : null}
        {page.path === "/awkwords-alternative/" ? <AwkwordsAlternative hrefs={hrefs}/> : null}
        {page.path === "/news/" ? <News/> : null}
    </Shell>
)
