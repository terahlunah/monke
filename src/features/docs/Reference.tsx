import {MouseEvent, ReactNode} from "react";
import {ScrollRegion} from "@/components/ScrollRegion.tsx";
import {scrollRegionTo} from "@/components/scroll.ts";
import {ExampleCard} from "./ExampleCard.tsx";
import {useExampleHrefs} from "./useExampleHrefs.ts";
import {
    exclusionDemos,
    firstGrammar,
    itemText,
    recipes,
    rewriteDemos,
    syntaxRows
} from "./referenceExamples.ts";

// Every example offering a Try it link, so their share URLs are encoded together once.
const allExamples = [firstGrammar, ...recipes]

const sections = [
    {id: "reference-quick-start", title: "Quick start"},
    {id: "reference-concepts", title: "Concepts"},
    {id: "reference-syntax", title: "Pattern syntax"},
    {id: "reference-weights", title: "Weights"},
    {id: "reference-rewrites", title: "Rewrites"},
    {id: "reference-exclusions", title: "Exclusions"},
    {id: "reference-output", title: "Generating, sharing and undo"},
    {id: "reference-reordering", title: "Reordering and keyboard"},
    {id: "reference-recipes", title: "Recipes"},
    {id: "reference-awkwords", title: "Coming from Awkwords"},
] as const

type SectionId = typeof sections[number]["id"]

// The URL path holds the shared config, so in-page links scroll and move focus themselves instead of changing the URL.
const jumpTo = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    e.preventDefault()
    scrollRegionTo(target.closest<HTMLElement>("[data-scroll-region]")!, target)
    target.focus({preventScroll: true})
}

export const Reference = () => {
    const hrefs = useExampleHrefs(allExamples)
    return (
        <ScrollRegion label="reference" className="flex flex-col bg-background grow p-4 md:p-8 gap-3 md:no-scrollbar pb-64 leading-relaxed">
            <div className="flex flex-col gap-3 max-w-3xl w-full mx-auto">
                <p className="text-lg">
                    Monke builds words from rules you write. This reference starts with a five-minute tour and ends with a
                    reference you can come back to.
                </p>

                <nav aria-label="Reference contents" className="rounded-sm bg-surface p-4">
                    <h2 className="font-bold mb-2">Contents</h2>
                    <ol className="list-decimal list-inside grid sm:grid-cols-2 gap-x-6 gap-y-1">
                        {sections.map(s => (
                            <li key={s.id}>
                                <a href={`#${s.id}`} onClick={e => jumpTo(e, s.id)}
                                   className="text-primary-text underline">{s.title}</a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <Section id="reference-quick-start">
                    <ol className="list-decimal pl-6 flex flex-col gap-2">
                        <li>On the Generator page, press <b>toki pona example</b> to load a small working grammar.</li>
                        <li>Press <b>Generate</b>. You get 50 words; change the number next to the button for more or fewer.</li>
                        <li>Find the rule named <b>Vowel</b>, add a terminal such as <Code>y</Code> and generate again.
                            The new vowel shows up in the words.</li>
                        <li>Made a mistake? Use your browser's <b>Back</b> button to undo the last edit.</li>
                    </ol>
                    <p>Or open the small grammar in the next section with its <b>Try it</b> link.</p>
                </Section>

                <Section id="reference-concepts">
                    <Sub>Rules</Sub>
                    <p>A grammar is a list of named rules. A name starts with a letter or <Code>_</Code> and continues with
                        letters, digits or <Code>_</Code>, so <Code>V</Code>, <Code>Syllable</Code> and <Code>coda_2</Code> all
                        work. Names are case-sensitive.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li><b>Terminal rules</b> (<b>Add Terminal Rule</b>) hold plain text, usually the sounds of your
                            language. Each terminal is used as written, without quotes: <Code>a</Code>, <Code>ch</Code>
                            and <Code>好</Code> are all fine.</li>
                        <li><b>Rules</b> (<b>Add Rule</b>) hold patterns that combine other rules and text. A rule needs
                            at least one pattern. Only rules can have rewrites and exclusions.</li>
                    </ul>
                    <p>Whenever a rule is used, Monke picks one of its terminals or patterns at random.</p>

                    <Sub>The start rule</Sub>
                    <p>Choose the <b>Start rule</b> above the rules. Every word is generated from it, and it uses other rules by
                        name. Rules the start rule never reaches don't affect the words, but they are still checked for errors.</p>

                    <Sub>Patterns</Sub>
                    <p>A pattern describes what a rule produces. Text goes in single quotes, rule names stand alone, and a dot
                        joins parts in order. This rule makes a consonant, a vowel and sometimes an n:</p>
                    <CodeBlock>{"C.V.('n')"}</CodeBlock>
                    <p>Here is a complete grammar using it. It makes words such as <Code>ka</Code>, <Code>sonmi</Code> and
                        <Code>tulipen</Code>.</p>
                    <ExampleCard hrefs={hrefs} example={firstGrammar}/>

                    <Sub>Status line and errors</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li><b>Grammar has N possible branches</b> counts the paths through the grammar, not distinct words:
                            two choices giving the same text count twice, and rewrites and exclusions are not taken into
                            account.</li>
                        <li><b>Grammar has at least one cycle: A &gt; B &gt; A</b> means rules refer back to themselves, so
                            branches can't be counted. Generation still runs, but if the cycle has no way out it fails with
                            an error.</li>
                        <li><b>Invalid grammar: …</b> names the problem and the rule, and marks the input at fault as invalid.
                            Common causes: an unknown rule name, an invalid rule name, a rule with no patterns, unbalanced
                            brackets or quotes, or a missing dot between two parts.</li>
                        <li><b>Exclusion rules are too restrictive</b> appears when generating if a rule's exclusions rejected
                            100 outputs in a row.</li>
                    </ul>
                </Section>

                <Section id="reference-syntax">
                    <p>Patterns, rewrites and exclusions share one syntax. Examples use the rules <Code>C</Code> and
                        <Code>V</Code> from the grammar above.</p>
                    <table className="w-full text-left border-collapse">
                        <caption className="sr-only">Pattern syntax</caption>
                        <thead>
                        <tr className="border-b border-white/20">
                            <th scope="col" className="py-2 pr-3">Syntax</th>
                            <th scope="col" className="py-2 pr-3">Meaning</th>
                            <th scope="col" className="py-2">Example</th>
                        </tr>
                        </thead>
                        <tbody>
                        {syntaxRows.map(row => (
                            <tr key={row.syntax} className="border-b border-white/10 align-top">
                                <th scope="row" className="py-2 pr-3 font-normal"><Code>{row.syntax}</Code></th>
                                <td className="py-2 pr-3">{row.meaning}</td>
                                <td className="py-2">
                                    <Code>{row.example}</Code>
                                    <span className="block text-sm text-on-surface/80">gives {row.output}</span>
                                </td>
                            </tr>
                        ))}
                        <tr className="align-top">
                            <th scope="row" className="py-2 pr-3 font-normal"><Code>#n#</Code></th>
                            <td className="py-2 pr-3">Back-reference to part n of a rewrite's match. Only in rewrite
                                replacements; see <a href="#reference-rewrites" onClick={e => jumpTo(e, "reference-rewrites")}
                                                    className="text-primary-text underline">Rewrites</a>.</td>
                            <td className="py-2"><Code>#1#.#0#</Code></td>
                        </tr>
                        </tbody>
                    </table>

                    <Sub>Precedence and spacing</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>The dot binds tighter than the slash: <Code>{"'a'.'b' / 'c'"}</Code> gives ab or c. Use a group to
                            choose inside a sequence: <Code>{"'a'.['b' / 'c']"}</Code> gives ab or ac.</li>
                        <li>An optional holds one alternative. To make a choice optional, group it:
                            <Code>{"(['n' / 's'])"}</Code>.</li>
                        <li>Spaces and line breaks outside quotes are ignored. Inside quotes they are part of the text.</li>
                        <li>An empty pattern or <Code>{"''"}</Code> produces nothing, which is a simple way to add an
                            "empty" option to a rule.</li>
                    </ul>
                </Section>

                <Section id="reference-weights">
                    <p>Weights are ignored until you turn on <b>Enable probability weights</b> in the generator panel. Until
                        then every alternative is equally likely and every optional is present half of the time.</p>
                    <p>Once enabled, each terminal and pattern gets a weight field next to it. Weights are relative: a weight of
                        2 is picked twice as often as a weight of 1. A weight of 0 is never picked, which is handy for
                        switching a pattern off temporarily.</p>
                    <p>Inside a pattern, put <Code>*N</Code> after an alternative. Alternatives without one weigh 1, so these
                        are equivalent:</p>
                    <CodeBlock>{"'a'*2 / 'e'\n'a' / 'e'*0.5"}</CodeBlock>
                    <p>An optional is present half of the time by default. <Code>{"('n'*0.2)"}</Code> makes it present 20% of
                        the time; keep this probability between 0 and 1.</p>
                    <p>Quantifiers like <Code>{"{1:3}"}</Code> always pick each count with the same probability. To favour some
                        lengths, use weighted alternatives instead, such as <Code>{"Syllable*3 / Syllable.Syllable"}</Code>.</p>
                    <ExampleCard hrefs={hrefs} example={recipes.find(r => r.id === "weighted")!}/>
                </Section>

                <Section id="reference-rewrites">
                    <p>Rewrites change a rule's output after it is generated, like sound changes. Turn on <b>Rw</b> in a rule's
                        header to show and enable its rewrites; turned off, they are kept but ignored.</p>
                    <p>A rewrite has a match and a replacement, both written in pattern syntax.</p>

                    <Sub>How rewrites are applied</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>Rewrites run in list order. Each one works on the output of the previous one.</li>
                        <li>Each rewrite scans the word from left to right. After a replacement, scanning continues after the
                            inserted text, so new text is never rewritten by the same rewrite.</li>
                        <li>A match must contain at least one character; parts that can be empty, like optionals, only count
                            together with something else.</li>
                        <li>If several matches start at the same place, the first one found wins: alternatives are tried in
                            the order written, optionals are tried present first, and quantifiers try the fewest repetitions
                            first.</li>
                        <li>A rule name in a match matches anything that rule's patterns can produce, regardless of weights.
                            Its own rewrites and exclusions are not considered.</li>
                        <li>Rewrites apply to the rule they belong to, each time it is used. Put a rewrite on the start rule to
                            work on whole words.</li>
                    </ul>

                    <Sub>Back-references</Sub>
                    <p>In a replacement, <Code>#n#</Code> inserts part n of the match, counting from 0. When the match is a
                        sequence, each item joined by a dot is one part, even if it is a rule or group producing several
                        letters. A match that is a single quoted text is part <Code>#0#</Code>.</p>
                    <p>A reference to a part the match can't have, such as <Code>#2#</Code> for <Code>{"'a'.'b'"}</Code>, is an
                        error. When the number of parts depends on what matched, a missing part inserts nothing.</p>

                    <Sub>Examples</Sub>
                    <ul className="flex flex-col gap-3">
                        {rewriteDemos.map((d, i) => (
                            <li key={i} className="rounded-sm bg-surface p-3 flex flex-col gap-1">
                                {d.rules?.map(r => <p key={r.name}>With rule <Code>{r.name}</Code> = <Code>{r.items.map(itemText).join(" / ")}</Code></p>)}
                                {d.rewrites.map(([m, r], j) => (
                                    <p key={j}>{d.rewrites.length > 1 ? `Rewrite ${j + 1}: ` : "Rewrite: "}
                                        <Code>{m}</Code> <Arrow/> <Code>{r}</Code></p>
                                ))}
                                <p><Code>{d.input}</Code> <Arrow/> <Code>{d.output}</Code></p>
                                <p className="text-on-surface/80">{d.note}</p>
                            </li>
                        ))}
                    </ul>
                </Section>

                <Section id="reference-exclusions">
                    <p>Exclusions reject outputs you don't want. Turn on <b>Ex</b> in a rule's header to show and enable them;
                        turned off, they are kept but ignored.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>An output is rejected if an exclusion matches <b>anywhere inside it</b>, not only if the whole
                            output matches.</li>
                        <li>All alternatives of a choice and all outputs of a referenced rule are checked, so
                            <Code>V.V</Code> rejects any two vowels in a row.</li>
                        <li>Exclusions check the output after the rule's rewrites.</li>
                        <li>A rejected output is generated again, only for that rule. After 100 rejections in a row,
                            generation stops with <b>Exclusion rules are too restrictive</b>.</li>
                    </ul>
                    <table className="w-full text-left border-collapse">
                        <caption className="text-left pb-2">Exclusions applied to sample outputs</caption>
                        <thead>
                        <tr className="border-b border-white/20">
                            <th scope="col" className="py-2 pr-3">Exclusion</th>
                            <th scope="col" className="py-2 pr-3">Output</th>
                            <th scope="col" className="py-2">Result</th>
                        </tr>
                        </thead>
                        <tbody>
                        {exclusionDemos.map((d, i) => (
                            <tr key={i} className="border-b border-white/10">
                                <td className="py-2 pr-3"><Code>{d.exclusion}</Code></td>
                                <th scope="row" className="py-2 pr-3 font-normal"><Code>{d.input}</Code></th>
                                <td className="py-2">{d.rejected ? "Rejected" : "Kept"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <p>To limit an exclusion to part of a word, put that part in its own rule and add the exclusion there.
                        See the recipes below.</p>
                </Section>

                <Section id="reference-output">
                    <Sub>Generator options</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>The number next to <b>Generate</b> sets how many words to make, from 1 to 10000.</li>
                        <li><b>Filter Duplicates</b> hides repeated words and shows how many are unique.</li>
                        <li><b>Output as list</b> shows one word per line instead of a paragraph. <b>Copy</b> copies the
                            words in the current layout.</li>
                        <li><b>Enable serifs</b> switches to a serif font, which makes some IPA characters easier to read.</li>
                    </ul>

                    <Sub>Share links</Sub>
                    <p>The whole configuration (rules, start rule, language name, weights and serif settings) is encoded in
                        the page address and updated as you edit. <b>Share link</b> copies it. Anyone opening it gets your
                        grammar; nothing is stored on a server. Links made by older versions of Monke still open.</p>

                    <Sub>Files</Sub>
                    <p><b>Export Config</b> downloads the configuration as a <Code>.monke</Code> file named after the
                        language. <b>Import Config</b> loads one, including files exported by older versions. Importing
                        replaces the current grammar.</p>

                    <Sub>Undo and redo</Sub>
                    <p>Every edit is a step in your browser history: <b>Back</b> undoes, <b>Forward</b> redoes. A burst of
                        typing counts as one step. Loading an example, importing a file and clearing are steps too.</p>
                </Section>

                <Section id="reference-reordering">
                    <p>Rules, terminals, patterns, rewrites and exclusions can be reordered. Order matters for rewrites; for
                        the rest it only changes how things look.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li><b>Drag</b> an item by its grip handle (on touch screens, press and hold first).</li>
                        <li><b>Keyboard drag:</b> focus the handle, press Space or Enter to pick the item up, move it with the
                            arrow keys, then press Space or Enter to drop it, or Escape to cancel.</li>
                        <li><b>Move buttons:</b> rules always show up and down buttons. Terminals, patterns, rewrites and
                            exclusions have left and right buttons that appear when the item has keyboard focus. Turn on
                            <b> Always show reorder buttons</b> to keep them visible. This setting stays in your browser and
                            is not part of share links.</li>
                    </ul>
                    <p>Each rule header also has buttons to collapse the rule, duplicate it and delete it. On the Generator
                        page, a <b>Skip to generator</b> link at the start jumps past the rules.</p>
                </Section>

                <Section id="reference-recipes">
                    <p>Each recipe is a complete grammar. <b>Try it</b> opens it in a new tab, so your current grammar is untouched.</p>
                    {recipes.filter(r => r.id !== "weighted" && r.id !== "awkwords").map(r =>
                        <ExampleCard hrefs={hrefs} key={r.id} example={r} summary={r.summary}/>)}
                </Section>

                <Section id="reference-awkwords">
                    <p>If you know Awkwords, most ideas carry over. The main differences: Monke has no single-letter limit
                        on names, needs dots between parts, and requires quotes around all literal text.</p>
                    <table className="w-full text-left border-collapse">
                        <caption className="sr-only">Awkwords syntax and its Monke equivalent</caption>
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

                    <Sub>Filters versus exclusions</Sub>
                    <p>An Awkwords <Code>^</Code> filter discards a result that is exactly equal to the filtered text. A
                        Monke exclusion rejects an output that <b>contains</b> a match. To get the exact behaviour, put the
                        filtered part in its own rule whose output always has the length of the banned text. A
                        <Code>Syllable</Code> rule that always makes two letters, with the exclusion <Code>{"'ti'"}</Code>,
                        rejects exactly the syllable ti. Unlike an exclusion on the whole word, it doesn't reject a ti formed
                        across two syllables.</p>
                    <ExampleCard hrefs={hrefs} example={recipes.find(r => r.id === "awkwords")!} summary={recipes.find(r => r.id === "awkwords")!.summary}/>

                    <Sub>Only in Monke</Sub>
                    <p>Repetition with <Code>{"{min:max}"}</Code>, rewrites with back-references, per-rule exclusions,
                        optional probabilities and weighted rule patterns.</p>
                </Section>
            </div>
        </ScrollRegion>
    )
}

const Section = ({id, children}: { id: SectionId, children: ReactNode }) => (
    <section aria-labelledby={id} className="flex flex-col gap-3 mt-6">
        <div className="flex flex-row items-baseline gap-4">
            <h2 id={id} tabIndex={-1} className="font-bold text-xl scroll-mt-4">{sections.find(s => s.id === id)!.title}</h2>
            <div className="h-0.5 bg-white/10 grow" aria-hidden="true"/>
        </div>
        {children}
    </section>
)

const Sub = ({children}: { children: ReactNode }) => <h3 className="font-bold text-lg mt-2">{children}</h3>

const Code = ({children}: { children: string }) => (
    // Short tokens like 'text' never break; only long ones may wrap anywhere, so narrow table cells can't overflow.
    <code className={`font-mono rounded-sm bg-white/10 px-1.5 py-0.5 ${children.length <= 12 ? "whitespace-pre" : "[overflow-wrap:anywhere] whitespace-pre-wrap"}`}>{children}</code>
)

const CodeBlock = ({children}: { children: string }) => (
    <pre className="font-mono rounded-sm bg-white/10 px-3 py-2 whitespace-pre-wrap"><code>{children}</code></pre>
)

const Arrow = () => <><span aria-hidden="true">→</span><span className="sr-only">becomes</span></>

const awkwordsRows: [ReactNode, ReactNode][] = [
    [<>Category <Code>V</Code> with <Code>a/i/u</Code></>, <>Terminal rule <Code>V</Code> with terminals <Code>a</Code>, <Code>i</Code>, <Code>u</Code>. Any name works, not only capital letters.</>],
    [<>Pattern <Code>CV</Code></>, <><Code>C.V</Code></>],
    [<>Lowercase letters, literal</>, <>Quoted text: <Code>{"'n'"}</Code>. A bare word is always a rule name.</>],
    [<>Quoted literal <Code>"..."</Code></>, <>Single quotes <Code>{"'...'"}</Code>, with <Code>{"\\'"}</Code> for a quote inside.</>],
    [<>Alternatives <Code>a/b</Code></>, <><Code>{"'a' / 'b'"}</Code></>],
    [<>Brackets <Code>[...]</Code></>, <>Group <Code>{"[...]"}</Code></>],
    [<>Optional <Code>(...)</Code></>, <>Optional <Code>{"(...)"}</Code>; a choice inside needs a group: <Code>{"(['a' / 'b'])"}</Code></>],
    [<>Weight <Code>*n</Code> on an alternative</>, <>Weight <Code>*N</Code>, used only when weights are enabled.</>],
    [<>Filter <Code>^</Code></>, <>Exclusion on the rule (see below).</>],
]
