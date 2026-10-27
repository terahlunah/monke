import {MouseEvent, ReactNode} from "react";
import {ScrollRegion} from "@/components/ScrollRegion.tsx";
import {scrollRegionTo} from "@/components/scroll.ts";
import {ExampleCard} from "./ExampleCard.tsx";
import {useExampleHrefs} from "./useExampleHrefs.ts";
import {Code} from "./Code.tsx";
import {awkwordsRows} from "./awkwordsRows.tsx";
import {
    allExamples,
    awkwordsExample,
    awkwordsImportDemo,
    firstGrammar,
    exclusionDemos,
    itemText,
    errorHintDemos,
    branchingExample,
    contrastExample,
    contrastRows,
    featureErrorDemos,
    unchosenWarningDemo,
    filterExample,
    harmonyExample,
    twoFeaturesExample,
    listAllDemo,
    seedDemo,
    recipes,
    rewriteDemos,
    syntaxRows
} from "./referenceExamples.ts";


const sections = [
    {id: "reference-quick-start", title: "Quick start"},
    {id: "reference-concepts", title: "Concepts"},
    {id: "reference-syntax", title: "Pattern syntax"},
    {id: "reference-weights", title: "Weights"},
    {id: "reference-rewrites", title: "Rewrites"},
    {id: "reference-exclusions", title: "Exclusions"},
    {id: "reference-boundaries", title: "Word boundaries"},
    {id: "reference-features", title: "Phonological features"},
    {id: "reference-output", title: "Generating, sharing and undo"},
    {id: "reference-reordering", title: "Reordering and keyboard"},
    {id: "reference-recipes", title: "Recipes"},
    {id: "reference-awkwords", title: "Coming from Awkwords"},
] as const

type SectionId = typeof sections[number]["id"]

// The URL path holds the shared config, so in-page links scroll and move focus themselves instead of changing the URL.
const jumpTo = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    const region = target?.closest<HTMLElement>("[data-scroll-region]")
    if (!target || !region) return
    e.preventDefault()
    scrollRegionTo(region, target)
    target.focus({preventScroll: true})
}

export const Reference = () => {
    const hrefs = useExampleHrefs(allExamples)
    return (
        <ScrollRegion label="reference" className="flex flex-col bg-background grow p-4 md:p-8 gap-3 md:no-scrollbar pb-64 leading-relaxed">
            <ReferenceContent hrefs={hrefs}/>
        </ScrollRegion>
    )
}

// The prerendered /reference/ page passes share URLs encoded at build time; the app encodes them on mount.
export const ReferenceContent = ({hrefs}: { hrefs: Record<string, string> }) => {
    return (
            // The nav comes first in the DOM: inline above the text on small screens, a sticky left column from lg up.
            // Sticky needs no effects, so it works in the prerendered page (window scroll) and in the app's scroll region.
            <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-10 max-w-6xl w-full mx-auto">
                <nav aria-label="Reference contents"
                     className="rounded-sm bg-surface p-4 lg:w-72 lg:shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto">
                    <h2 className="font-bold mb-2">Contents</h2>
                    <ol className="list-decimal list-inside grid sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-1">
                        {sections.map(s => (
                            <li key={s.id}>
                                <a href={`#${s.id}`} onClick={e => jumpTo(e, s.id)}
                                   className="text-primary-text underline">{s.title}</a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="flex flex-col gap-3 max-w-3xl min-w-0 w-full">
                <p className="text-lg">
                    Monke builds words from rules you write. This reference starts with a five-minute tour and ends with a
                    reference you can come back to.
                </p>

                <Section id="reference-quick-start">
                    <ol className="list-decimal pl-6 flex flex-col gap-2">
                        <li>On the Generator page, open <b>Examples</b> in the bar above the rules and choose <b>toki pona example</b> to
                            load a small working grammar.</li>
                        <li>The words appear by themselves: 50 of them. Press <b>New words</b> for a fresh set, or change the
                            word count for more or fewer.</li>
                        <li>Find the rule named <b>Vowel</b> and add a terminal such as <Code>y</Code> with <b>+ Terminal</b>. To add
                            several at once, type them separated by spaces in <b>Add several</b> and press Enter. The new
                            vowels show up in the words.</li>
                        <li>Made a mistake? Use your browser's <b>Back</b> button to undo the last edit.</li>
                    </ol>
                    <p>Or open the small grammar in the next section with its <b>Try it</b> link.</p>
                </Section>

                <Section id="reference-concepts">
                    <Sub>Rules</Sub>
                    <p>A grammar is a list of named rules. A name starts with a letter or <Code>_</Code> and continues with
                        letters, digits or <Code>_</Code>, so <Code>V</Code>, <Code>Syllable</Code> and <Code>coda_2</Code> all
                        work. Names are case-sensitive and must be unique.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li><b>Terminal rules</b> (<b>+ Terminal rule</b>, named in blue) hold plain text, usually the sounds of your
                            language. Each terminal is used as written, without quotes: <Code>a</Code>, <Code>ch</Code>{" "}
                            and <Code>好</Code> are all fine.</li>
                        <li><b>Pattern rules</b> (<b>+ Pattern rule</b>, named in violet) hold patterns that combine other rules and text. A rule needs
                            at least one pattern. Only pattern rules can have rewrites and exclusions.</li>
                    </ul>
                    <p>Whenever a rule is used, Monke picks one of its terminals or patterns at random.</p>

                    <Sub>The start rule</Sub>
                    <p>Choose the <b>Start rule</b> in the bar above the rules; the rule's header then says <b>start rule</b>. Every word is generated from it, and it uses other rules by
                        name. Rules the start rule never reaches don't affect the words, but they are still checked for errors.</p>

                    <Sub>Patterns</Sub>
                    <p>A pattern describes what a rule produces. Text goes in single quotes, rule names stand alone, and a dot
                        joins parts in order. This rule makes a consonant, a vowel and sometimes an n:</p>
                    <CodeBlock>{"C.V.('n')"}</CodeBlock>
                    <p>Here is a complete grammar using it. It makes words such as <Code>ka</Code>, <Code>sonmi</Code> and{" "}
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
                            Common causes: an unknown rule name, an invalid rule name, two rules with the same name, a rule
                            with no patterns, unbalanced brackets or quotes, a missing dot between two parts, or an optional
                            probability above 1.</li>
                        <li><b>Exclusion rules are too restrictive</b> appears when generating if a rule's exclusions rejected
                            100 outputs in a row.</li>
                        <li><b>Rewrites of rule … did not settle</b> appears when generating with repeated
                            rewrites if they keep changing the output (see Rewrites).</li>
                    </ul>
                </Section>

                <Section id="reference-syntax">
                    <p>Patterns, rewrites and exclusions share one syntax. Examples use the rules <Code>C</Code> and{" "}
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
                            <td className="py-2 pr-3">Back-reference to part n of a match. In rewrite replacements it inserts
                                that part; in rewrite matches and exclusions it matches the same text again. See <a href="#reference-rewrites" onClick={e => jumpTo(e, "reference-rewrites")}
                                                    className="text-primary-text underline">Rewrites</a>.</td>
                            <td className="py-2"><Code>#1#.#0#</Code></td>
                        </tr>
                        <tr className="align-top">
                            <th scope="row" className="py-2 pr-3 font-normal"><Code>^</Code> and <Code>$</Code></th>
                            <td className="py-2 pr-3">Start and end of the rule's output. Only in rewrite matches and
                                exclusions; see <a href="#reference-boundaries" onClick={e => jumpTo(e, "reference-boundaries")}
                                                  className="text-primary-text underline">Word boundaries</a>.</td>
                            <td className="py-2"><Code>{"'h'.$"}</Code></td>
                        </tr>
                        </tbody>
                    </table>

                    <Sub>Precedence and spacing</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>The dot binds tighter than the slash: <Code>{"'a'.'b' / 'c'"}</Code> gives ab or c. Use a group to
                            choose inside a sequence: <Code>{"'a'.['b' / 'c']"}</Code> gives ab or ac.</li>
                        <li>An optional holds one alternative. To make a choice optional, group it:{" "}
                            <Code>{"(['n' / 's'])"}</Code>.</li>
                        <li>Spaces and line breaks outside quotes are ignored. Inside quotes they are part of the text.</li>
                        <li>An empty pattern or <Code>{"''"}</Code> produces nothing, which is a simple way to add an
                            "empty" option to a rule.</li>
                    </ul>
                </Section>

                <Section id="reference-weights">
                    <p>Weights are ignored until you turn on <b>Weights</b> in the bar above the rules. Until
                        then every alternative is equally likely and every optional is present half of the time.</p>
                    <p>Once enabled, each terminal and pattern row gets a weight field. Weights are relative: a weight of
                        2 is picked twice as often as a weight of 1. A weight of 0 is never picked, which is handy for
                        switching a pattern off temporarily.</p>
                    <p>Inside a pattern, put <Code>*N</Code> after an alternative. Alternatives without one weigh 1, so these
                        are equivalent:</p>
                    <CodeBlock>{"'a'*2 / 'e'\n'a' / 'e'*0.5"}</CodeBlock>
                    <p>An optional is present half of the time by default. <Code>{"('n'*0.2)"}</Code> makes it present 20% of
                        the time. The probability must be between 0 and 1; a larger value is an error.</p>
                    <p>Quantifiers like <Code>{"{1:3}"}</Code> always pick each count with the same probability. To favour some
                        lengths, use weighted alternatives instead, such as <Code>{"Syllable*3 / Syllable.Syllable"}</Code>.</p>
                    <ExampleCard hrefs={hrefs} example={recipes.find(r => r.id === "weighted")!}/>

                    <Sub id="reference-fewer-repeats">Fewer repeats in a word</Sub>
                    <p>A repeat factor lowers the chance of picking the same thing again in a word. With weights on, every
                        terminal and pattern row has a <b>Repeat</b> field next to its <b>Weight</b> (1 by default, no
                        effect). A rule&apos;s rows are the alternatives of its choice: each time a row was already picked
                        in the current word, its weight is multiplied by the factor. With 0.5 the second pick of the row is
                        half as likely as the first, the third a quarter, and so on.</p>
                    <p>Inside a pattern, put <Code>~F</Code> after an alternative, after its weight if it has one:
                        <Code>{"'a'*2~0.5 / 'e'"}</Code>. With <Code>{"['a'~0.2 / 'e']{3}"}</Code> a second a is five times
                        less likely than the first. The count is kept per place in the grammar: the same alternative
                        written in two patterns, or two rules, has two counts.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>Counts start again for every word. When an exclusion rejects a rule&apos;s output and it is
                            generated again, what the rejected attempt picked no longer counts.</li>
                        <li>A factor of 0 never blocks the first use: it only rules out repeats.</li>
                        <li>Factors only change probabilities. Generate all and the number of possible branches are the
                            same as without them, and with weights off they are ignored.</li>
                    </ul>
                    <ExampleCard hrefs={hrefs} example={recipes.find(r => r.id === "repeat-weight")!}
                                 summary={recipes.find(r => r.id === "repeat-weight")!.summary}/>
                </Section>

                <Section id="reference-rewrites">
                    <p>Rewrites change a rule's output after it is generated, like sound changes. Turn on <b>Rewrites</b> in a pattern rule's
                        header to show and enable its rewrites; turned off, they are kept but ignored.</p>
                    <p>A rewrite has a match and a replacement, both written in pattern syntax.</p>

                    <Sub>How rewrites are applied</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>Rewrites run in list order. Each one works on the output of the previous one.</li>
                        <li>Each rewrite scans the word from left to right. After a replacement, scanning continues after the
                            inserted text, so new text is never rewritten by the same rewrite.</li>
                        <li>By default the list runs once, so an earlier rewrite never sees what a later one produced. Turn
                            on <b>Repeat rewrites</b> in the bar above the rules to run the whole list
                            again and again until a pass leaves the output unchanged. If the output still changes after 32
                            passes, for example because two rewrites undo each other, or grows past 10000 characters
                            because a rewrite keeps adding text, generation stops with <b>Rewrites of rule … did not
                            settle</b>. A replacement with a random choice can also keep changing the output.</li>
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
                    <p>In a match, and in an exclusion, <Code>#n#</Code> matches exactly the text that part n matched, so{" "}
                        <Code>C.#0#</Code> finds pp or tt but not pt. Parts are counted the same way, and a back-reference
                        must come after the part it refers to: <Code>#0#.C</Code> is an error. The parts it can refer to
                        are those of the outer sequence, even from inside a group: in <Code>{"C.V.[#0# / 'h']"}</Code>,
                        the last part is the first consonant again or an h.</p>

                    <Sub>Examples</Sub>
                    <ul className="flex flex-col gap-3">
                        {rewriteDemos.map((d, i) => (
                            <li key={i} className="rounded-sm bg-surface p-3 flex flex-col gap-1">
                                {d.repeat && <p>With <b>Repeat rewrites</b> on</p>}
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
                    <p>Exclusions reject outputs you don't want. Turn on <b>Exclusions</b> in a pattern rule's header to show and enable them;
                        turned off, they are kept but ignored.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>An output is rejected if an exclusion matches <b>anywhere inside it</b>, not only if the whole
                            output matches.</li>
                        <li>All alternatives of a choice and all outputs of a referenced rule are checked, so{" "}
                            <Code>V.V</Code> rejects any two vowels in a row.</li>
                        <li><Code>#n#</Code> matches the same text as part n of the exclusion, so <Code>C.#0#</Code>{" "}
                            rejects any doubled consonant. Parts are counted as in <a href="#reference-rewrites"
                            onClick={e => jumpTo(e, "reference-rewrites")} className="text-primary-text underline">rewrite
                            back-references</a>.</li>
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
                    <p>To limit an exclusion to the start or end of a word, use <a href="#reference-boundaries"
                        onClick={e => jumpTo(e, "reference-boundaries")} className="text-primary-text underline">word
                        boundaries</a>. To limit it to another part of a word, put that part in its own rule and add the
                        exclusion there. See the recipes below.</p>
                </Section>

                <Section id="reference-boundaries">
                    <p>In a rewrite match or an exclusion, <Code>^</Code> matches the start and <Code>$</Code> the end.
                        They match a position, not a letter, so <Code>{"'h'.$"}</Code> matches an h only when it is
                        last.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>The start and end are those of the output being checked: the output of the rule the rewrite or
                            exclusion belongs to. On the start rule, that is the whole word. On a <Code>Syllable</Code> rule,{" "}
                            <Code>^</Code> is the start of each syllable.</li>
                        <li>With several rewrites, the edges are those of the output as it is when that rewrite runs.</li>
                        <li>A boundary counts as a part for back-references, an empty one: in <Code>{"^.'ŋ'.V"}</Code>,{" "}
                            <Code>#0#</Code> is empty, <Code>#1#</Code> is ŋ and <Code>#2#</Code> is the vowel.</li>
                        <li>A boundary alone matches nothing, since a match must contain at least one character.</li>
                        <li>Boundaries can't be generated, so they are an error in a rule's patterns and in rewrite
                            replacements. In terminal rules, <Code>^</Code> and <Code>$</Code> are plain text.</li>
                    </ul>
                    <ExampleCard hrefs={hrefs} example={recipes.find(r => r.id === "edges")!}
                                 summary={recipes.find(r => r.id === "edges")!.summary}/>
                </Section>

                <Section id="reference-features">
                    <p>Features keep sounds consistent across a word, like vowel harmony: once a word picks front
                        vowels, every vowel in it is front. It takes four steps: declare a feature and its values, say
                        which rules it tags, put values on their rows, then pick or filter.</p>

                    <Sub>1. Declaring features</Sub>
                    <p>Use <b>+ Feature</b> in the <b>Phonological features</b> panel above the rules, name it, and add
                        its values with <b>+ value</b>, such as <Code>harmony</Code> with <Code>front</Code> and{" "}
                        <Code>back</Code>. Feature and value names follow the rules for rule names: letters, digits and
                        underscores, not starting with a digit. A value name can be used only once in the grammar, even
                        across features, so a value on its own says which feature it belongs to. With <b>Weights</b> on,
                        each value has a weight that sets how often a rule chooses it.</p>
                    <p>Deleting a feature or a value also removes it from every rule and row that used it. Browser Back
                        undoes it. Filters written in patterns are text, so renaming or deleting does not change them.</p>

                    <Sub id="reference-rule-features">2. Rule features</Sub>
                    <p>In a rule&apos;s header, the <b>+</b> after <b>Tags by</b> adds a feature that classifies that
                        rule&apos;s rows: for a Vowel rule, harmony. Only the rules that list a feature are concerned by it:</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>In a rule that lists the feature, every row has a definite status: it carries one or more
                            of its values, or none of them. A row without a value is <b>none of the values</b>, like a
                            neutral vowel that is neither front nor back.</li>
                        <li>A rule that does not list the feature is only structure, like a Syllable rule. Filters and
                            choices pass through it to the rules it uses.</li>
                    </ul>

                    <Sub>3. Giving values to rows</Sub>
                    <p>Once a rule lists a feature, each of its terminal and pattern rows has a <b>Feature values</b>{" "}
                        button, a tag icon, with a checkbox for each value of the rule&apos;s features. The row then
                        shows its values in brackets, like <Code>[front]</Code>. A row can carry values of several
                        features, such as <Code>[front, flat]</Code>, and several values of one feature, counting as
                        each of them. Removing a feature from a rule removes its values from that rule&apos;s rows.</p>

                    <Sub id="reference-choosing-a-value">4. Choosing a value</Sub>
                    <p>The <b>+</b> after <b>Picks</b> in a rule&apos;s header adds a feature the rule picks. Each time
                        the rule is used, it picks one value of each feature it picks, before generating anything. In everything below
                        it, its own rows and every rule it reaches, rows carrying another value of that feature are
                        removed. Rows with none of the values stay: that is how a neutral vowel goes with both sides.
                        The weights of what is left are shared out as usual.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>Pick on the start rule to keep a whole word consistent, or on a <Code>Syllable</Code> rule
                            to pick again in each syllable.</li>
                        <li>A rule below may pick the same feature again: its own pick applies to everything under it
                            instead.</li>
                        <li>Rewrites and exclusions work on the rule&apos;s output. Rule names in a rewrite replacement
                            are generated with the rule&apos;s chosen values. When an exclusion rejects an output, the
                            rule picks again.</li>
                    </ul>
                    <ExampleCard hrefs={hrefs} example={harmonyExample} summary={harmonyExample.summary}/>

                    <Sub>5. Filters</Sub>
                    <p>A filter after a rule name narrows that rule and everything it reaches, in every rule listing
                        the feature, with or without a choice:</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li><Code>{"Vowel<front>"}</Code> means <b>only front</b>: rows without front are removed, rows
                            with none of the values included.</li>
                        <li><Code>{"Vowel<!back>"}</Code> means <b>anything but back</b>: only rows carrying back are
                            removed, so rows with none of the values stay.</li>
                        <li>Several values of one feature allow any of them: <Code>{"Vowel<front, back>"}</Code>. Values
                            of different features must all hold: <Code>{"Vowel<front, !round>"}</Code>.</li>
                        <li>Filters work in patterns, rewrite matches and exclusions, and reach through rules that do
                            not list the feature: <Code>{"Syllable<front>"}</Code> gives syllables with front vowels.</li>
                    </ul>
                    <p>Filters and choices add up: what reaches a rule must pass every filter above it and match the
                        chosen value. A filter only narrows, and a Choose below it picks only among the values the
                        filters allow, so under <Code>{"<front>"}</Code> it always picks front and rows with none of
                        the values stay out. Only a Choose replaces an earlier choice of the same feature.</p>
                    <p>With this Vowel rule, where e is front, o is back and a carries no value, and{" "}
                        <Code>Syllable</Code> = <Code>{"'t'.Vowel"}</Code>, a Word pattern gives:</p>
                    <ExampleCard hrefs={hrefs} example={contrastExample}/>
                    <table className="w-full text-left border-collapse">
                        <caption className="sr-only">Filters and choices compared</caption>
                        <thead>
                        <tr className="border-b border-white/20">
                            <th scope="col" className="py-2 pr-3">Word pattern</th>
                            <th scope="col" className="py-2 pr-3">Words</th>
                            <th scope="col" className="py-2">Why</th>
                        </tr>
                        </thead>
                        <tbody>
                        {contrastRows.map(row => (
                            <tr key={row.pattern + (row.value ?? "")} className="border-b border-white/10 align-top">
                                <th scope="row" className="py-2 pr-3 font-normal">
                                    <Code>{row.pattern}</Code>{row.chooses ? `, Word chooses harmony, picking ${row.value}` : ""}
                                </th>
                                <td className="py-2 pr-3">{row.words.join(", ")}</td>
                                <td className="py-2">{row.meaning}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <ExampleCard hrefs={hrefs} example={filterExample}/>

                    <Sub>Several features</Sub>
                    <p>A rule can tag by and pick several features, and rows can carry values of each. Here a word is
                        front or back and round or flat; y is front and round, and flat words are twice as likely.</p>
                    <ExampleCard hrefs={hrefs} example={twoFeaturesExample}/>

                    <Sub>Branching on a choice</Sub>
                    <p>Values on pattern rows pick between whole structures. Word chooses a class, noun twice as often
                        as verb; nouns end in n or nothing, verbs in la or nothing.</p>
                    <ExampleCard hrefs={hrefs} example={branchingExample}/>

                    <Sub>6. Errors and warnings</Sub>
                    <p>Problems are found before generating and shown under the input at fault. With the vowel harmony
                        grammar above, these Word patterns give:</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        {featureErrorDemos.map(d => (
                            <li key={d.pattern}><Code>{d.pattern}</Code>{d.chooses ? "" : ", without choosing harmony"}: <b>{d.message}</b></li>
                        ))}
                    </ul>
                    <p>Also errors: a rule left with no row at some spot, a Choose the filters above leave no value
                        for, a row carrying a value of a feature its rule does not list, and invalid or duplicate
                        names. Only warnings, listed under the word count: a feature or value without a name yet
                        (ignored until it gets one), a feature nothing uses, a rule listing a feature none of its rows
                        carries, a Choose no rule below it lists, and a rule reached where its feature is neither chosen
                        nor filtered, which keeps all its rows. For example, <Code>{unchosenWarningDemo.pattern}</Code>{" "}
                        without choosing harmony gives: <b>{unchosenWarningDemo.message}</b></p>
                    <p>Generate all lists the words for every value each choice can take. The number of possible
                        branches counts each chosen value separately, so a word made only of rows without values is
                        counted once per value.</p>
                </Section>

                <Section id="reference-output">
                    <Sub>Generator options</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>The <b>Count</b> field sets how many words to make, from 1 to 10000.</li>
                        <li><b>Paragraph</b> and <b>List</b> choose between running text and one word per line.{" "}
                            <b>Copy</b> copies the words in the current layout.</li>
                        <li><b>Repeat rewrites</b>, in the bar above the rules, runs each rule's rewrite list until it
                            stops changing the output, instead of once (see Rewrites). It is saved in share links.</li>
                        <li>The <b>View settings</b> menu (the gear next to <b>Words</b>) holds three options.{" "}
                            <b>Filter duplicates</b> hides repeated words and shows how many are unique.{" "}
                            <b>Serif font</b> switches the words and your patterns to a serif font, which makes some IPA
                            characters easier to read. <b>Always show reorder buttons</b> is described under Reordering.
                            The menu stays open while you toggle them; press Escape to close it.</li>
                    </ul>

                    <Sub>Seed and automatic updates</Sub>
                    <p>The words are decided entirely by the <b>Seed</b> field, the grammar and the word count: the same
                        three always give the same words, in the same order. The seed is saved in share links, so others
                        see your exact list. Every grammar always has a seed; any text works. <b>New words</b> picks a
                        new random seed and so a new set of words. For example, the first grammar above with the seed{" "}
                        <Code>{seedDemo.seed}</Code> starts with <Code>{seedDemo.words.join(", ")}</Code>.</p>
                    <p>The words update by themselves, a quarter of a second after each edit that leaves the grammar
                        valid, and straight away when you change the seed or word count. An edit therefore shows how the
                        same draws change rather than a new random list. Screen readers are not told about these updates,
                        to avoid talking over your typing; <b>New words</b> and <b>Generate all</b> announce how many
                        words they made. Each <b>New words</b> press is an edit like any other, so Back restores the
                        previous words. If a redraw takes more than a moment, the old words dim and the button shows a spinner until the new ones are ready.</p>

                    <Sub>Generate all</Sub>
                    <p><b>Generate all</b> lists every distinct word the start rule can make, sorted, instead of random
                        draws: useful to export a full syllable inventory. Rewrites and exclusions apply exactly as when
                        generating, and weights only matter where they are zero. It stops after 10,000 words and says
                        the list is truncated. It is unavailable when the grammar has a cycle (the list would be
                        endless) or more than 1,000,000 branches; the reason is shown under the buttons.</p>
                    <p>For example, with terminals <Code>C</Code> = <Code>{listAllDemo.example.rules[0].items.join(", ")}</Code>,{" "}
                        <Code>V</Code> = <Code>{listAllDemo.example.rules[1].items.join(", ")}</Code> and the root{" "}
                        <Code>{listAllDemo.example.rules[2].items[0]}</Code>, with the rewrite{" "}
                        <Code>{listAllDemo.example.rules[2].rewrites![0].join(" → ")}</Code> and the exclusion{" "}
                        <Code>{listAllDemo.example.rules[2].exclusions![0]}</Code>, Generate all lists:</p>
                    <ul className="list-disc pl-6">
                        {listAllDemo.words.map(w => <li key={w}><Code>{w}</Code></li>)}
                    </ul>

                    <Sub>Errors and hints</Sub>
                    <p>When the grammar is invalid, the error appears under the input at fault (and in the generator
                        panel), and that input is marked invalid for screen readers. Parse errors give the character
                        position, counting from 1. Two common mistakes get a hint: a rule name one or two letters away from
                        an existing one suggests it, and two terms side by side suggest the missing <Code>.</Code>. With
                        the first grammar's rules, a <Code>Word</Code> pattern of:</p>
                    <ul className="list-disc pl-6 flex flex-col gap-1">
                        {errorHintDemos.map(d => <li key={d.pattern}><Code>{d.pattern}</Code> reports <Code>{d.message}</Code></li>)}
                    </ul>

                    <Sub>Share links</Sub>
                    <p>The whole configuration (rules, start rule, language name, weights, repeated rewrites, serif
                        settings and seed) is encoded in
                        the page address and updated as you edit. <b>Share link</b> in the bar above the rules copies it. Anyone opening it gets your
                        grammar; nothing is stored on a server. Links made by older versions of Monke still open.</p>

                    <Sub>Files</Sub>
                    <p><b>Export</b>, then <b>Monke file</b>, downloads the configuration as a <Code>.monke</Code> file named
                        after the language. <b>Import</b>, then <b>Monke file</b>, loads one, including files exported by
                        older versions. Importing replaces the current grammar. On small screens both are in one{" "}
                        <b>Files</b> menu.</p>
                    <p><b>Examples</b> loads the toki pona grammars or any recipe from this reference, and <b>New</b>{" "}
                        starts an empty grammar. Both replace the current grammar.</p>

                    <Sub>Undo and redo</Sub>
                    <p>Every edit is a step in your browser history: <b>Back</b> undoes, <b>Forward</b> redoes. A burst of
                        typing counts as one step. Loading an example, importing a file and choosing <b>New</b> are steps too.</p>
                </Section>

                <Section id="reference-reordering">
                    <p>Rules, terminals, patterns, rewrites and exclusions can be reordered. Order matters for rewrites; for
                        the rest it only changes how things look.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li><b>Drag</b> an item by its grip handle, the three dots (on touch screens, press and hold first).</li>
                        <li><b>Keyboard drag:</b> focus the handle, press Space or Enter to pick the item up, move it with the
                            arrow keys, then press Space or Enter to drop it, or Escape to cancel.</li>
                        <li><b>Move buttons:</b> rules always show up and down buttons (on small screens they are in the{" "}
                            <b>More actions</b> menu at the end of the rule's header). Terminals, patterns and rewrites are
                            rows with up and down buttons, and exclusions have left and right buttons; these appear when
                            the item has keyboard focus. Turn on <b>Always show reorder buttons</b> in the{" "}
                            <b>View settings</b> menu to keep them visible. This setting stays in your browser and is not
                            part of share links.</li>
                    </ul>
                    <p>Each rule header also has buttons to collapse the rule, duplicate it and delete it. A collapsed
                        terminal rule lists its terminals in the header. On the Generator page, a <b>Skip to generator</b> link at the start jumps past the rules.</p>
                </Section>

                <Section id="reference-recipes">
                    <p>Each recipe is a complete grammar. <b>Try it</b> opens it in a new tab, so your current grammar is untouched.</p>
                    {recipes.filter(r => !["weighted", "repeat-weight", "awkwords", "edges", "harmony"].includes(r.id)).map(r =>
                        <ExampleCard hrefs={hrefs} key={r.id} example={r} summary={r.summary}/>)}
                </Section>

                <Section id="reference-awkwords">
                    <p>If you know Awkwords, most ideas carry over. Awkwords subpatterns become rules and the main pattern
                        becomes the root rule. The main differences: Monke names are not limited to one capital letter,
                        parts are joined with dots, and all literal text is quoted.</p>
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
                    <p>An Awkwords filter, as in <Code>{"[VV]^aa"}</Code>, applies only to the fragment written just before
                        the <Code>^</Code>: a bracket, a subpattern letter or a run of letters. If that fragment generates
                        exactly the filter text, the whole word is dropped, so you may get fewer words than you asked for. A
                        Monke exclusion belongs to a rule: when the rule's output <b>contains</b> a match, that rule is
                        generated again. When the filtered fragment is always generated, the words you get follow the same
                        odds as the words Awkwords keeps. Inside an alternative or an optional they don't: Awkwords' dropped
                        words make that alternative rarer, while a Monke retry keeps its odds.</p>
                    <p>To translate a filter, put the filtered fragment in its own rule and add the filter text as an
                        exclusion of that rule. Containing and being equal are the same when no other output of the rule can
                        contain the banned text, for example when every output has the same length. In this example from the
                        Awkwords help, <Code>{"[VV]t[VV]^aa^ii^uu"}</Code>, only the second pair of vowels may not repeat a
                        vowel.</p>
                    <ExampleCard hrefs={hrefs} example={awkwordsExample} summary={awkwordsExample.summary}/>

                    <Sub>Importing Awkwords files</Sub>
                    <p>On the Generator page, <b>Import</b>, then <b>Awkwords</b>, converts an Awkwords pattern into a Monke grammar. Choose
                        an <Code>.awkw</Code> file saved by Awkwords, or paste a pattern. To paste subpatterns as well, write
                        them one per line as a saved file does: <Code>V:a/i/u</Code>, then <Code>r:CV</Code> for the main
                        pattern. The import replaces the current grammar; the browser's Back button undoes it.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-1">
                        <li>Each subpattern becomes a rule named by its letter, and the main pattern becomes the root
                            rule <Code>Word</Code>. Plain alternatives become terminal rules.</li>
                        <li>Brackets, optionals, escapes and weights are translated as in the table above. Weights are
                            enabled when the pattern uses any.</li>
                        <li>The number of words fills the word count; <b>filter duplicates</b> and <b>new line each</b> set
                            Filter duplicates and the List style.</li>
                        <li>Each filtered fragment becomes a rule named <Code>Filtered1</Code>, <Code>Filtered2</Code>, and
                            so on, holding just that fragment, with one exclusion per filter.</li>
                    </ul>
                    <p>An imported exclusion is written <Code>{"^.'text'.$"}</Code>: <Code>^</Code> and <Code>$</Code> pin
                        it to the start and end of the rule's output, so it rejects the output only when it is exactly the
                        filter text, as Awkwords did. For <Code>{awkwordsImportDemo.awkwords}</Code>, the rule{" "}
                        <Code>{awkwordsImportDemo.rule}</Code> has the patterns <Code>{awkwordsImportDemo.patterns.join(", ")}</Code> and
                        the exclusion <Code>{awkwordsImportDemo.exclusion}</Code>, so it gives only <Code>ab</Code>. A plain
                        exclusion <Code>{"'a'"}</Code> would reject <Code>ab</Code> too. A filter made only of spaces rejects
                        an empty result; that case uses a helper rule ending in <Code>Marked</Code> that adds an invisible
                        marker, which a rewrite then removes.</p>
                    <p>When something does not translate exactly, the import lists notes in the output panel until you
                        dismiss them. The most common ones:</p>
                    <ul className="list-disc pl-6 flex flex-col gap-1">
                        <li><b>Probabilities may differ slightly</b>: the filtered fragment is inside an alternative or an
                            optional. You get the same words, but with different odds (see Filters versus exclusions).</li>
                        <li><b>Removes every possible result</b> or <b>reject N% of results</b>: Monke retries a rule 100
                            times, then reports it as too restrictive.</li>
                        <li><b>No subpattern</b>: a capital letter without a subpattern generated nothing in Awkwords; it
                            becomes an empty rule.</li>
                        <li><b>Empty alternative</b>: a <Code>/</Code> at the end of a list, as in <Code>{"[a/]"}</Code>,
                            is kept as an empty alternative, although Awkwords 1.2 ignored it.</li>
                        <li><b>Weight read as</b>: a weight outside 1 to 128, or several in one alternative, is imported
                            with the value Awkwords used.</li>
                    </ul>
                    <p>Unmatched brackets stop the import with the line and column at fault, since Awkwords refused them
                        too. A letter right after a filter, as in <Code>{"[VV]^aaC"}</Code>, is kept, although Awkwords
                        skipped it.</p>

                    <Sub>Only in Monke</Sub>
                    <p>Repetition with <Code>{"{min:max}"}</Code>, rewrites with back-references, exclusions that match
                        patterns instead of fixed text, optional probabilities, decimal weights and weighted rule patterns.</p>
                </Section>
                </div>
            </div>
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

// An id makes the subsection a target for help tips and links, like a section heading.
const Sub = ({children, id}: { children: ReactNode, id?: string }) =>
    <h3 id={id} tabIndex={id ? -1 : undefined} className="font-bold text-lg mt-2 scroll-mt-4">{children}</h3>

const CodeBlock = ({children}: { children: string }) => (
    <pre className="font-mono rounded-sm bg-white/10 px-3 py-2 whitespace-pre-wrap"><code>{children}</code></pre>
)

const Arrow = () => <><span aria-hidden="true">→</span><span className="sr-only">becomes</span></>
