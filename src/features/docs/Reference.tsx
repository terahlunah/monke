import {MouseEvent, ReactNode} from "react";
import {ScrollRegion} from "@/components/ScrollRegion.tsx";
import {scrollRegionTo} from "@/components/scroll.ts";
import {ExampleCard} from "./ExampleCard.tsx";
import {useExampleHrefs} from "./useExampleHrefs.ts";
import {
    awkwordsImportDemo,
    exclusionDemos,
    firstGrammar,
    itemText,
    errorHintDemos,
    listAllDemo,
    seedDemo,
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
    {id: "reference-boundaries", title: "Word boundaries"},
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
                        work. Names are case-sensitive and must be unique.</p>
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
                        the time. The probability must be between 0 and 1; a larger value is an error.</p>
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
                        <li>By default the list runs once, so an earlier rewrite never sees what a later one produced. Turn
                            on <b>Repeat rewrites until nothing changes</b> in the generator panel to run the whole list
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
                    <p>In a match, and in an exclusion, <Code>#n#</Code> matches exactly the text that part n matched, so
                        <Code>C.#0#</Code> finds pp or tt but not pt. Parts are counted the same way, and a back-reference
                        must come after the part it refers to: <Code>#0#.C</Code> is an error. The parts it can refer to
                        are those of the outer sequence, even from inside a group: in <Code>{"C.V.[#0# / 'h']"}</Code>,
                        the last part is the first consonant again or an h.</p>

                    <Sub>Examples</Sub>
                    <ul className="flex flex-col gap-3">
                        {rewriteDemos.map((d, i) => (
                            <li key={i} className="rounded-sm bg-surface p-3 flex flex-col gap-1">
                                {d.repeat && <p>With <b>Repeat rewrites until nothing changes</b> on</p>}
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
                        <li><Code>#n#</Code> matches the same text as part n of the exclusion, so <Code>C.#0#</Code>
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
                            exclusion belongs to. On the start rule, that is the whole word. On a <Code>Syllable</Code> rule,
                            <Code>^</Code> is the start of each syllable.</li>
                        <li>With several rewrites, the edges are those of the output as it is when that rewrite runs.</li>
                        <li>A boundary counts as a part for back-references, an empty one: in <Code>{"^.'ŋ'.V"}</Code>,
                            <Code>#0#</Code> is empty, <Code>#1#</Code> is ŋ and <Code>#2#</Code> is the vowel.</li>
                        <li>A boundary alone matches nothing, since a match must contain at least one character.</li>
                        <li>Boundaries can't be generated, so they are an error in a rule's patterns and in rewrite
                            replacements. In terminal rules, <Code>^</Code> and <Code>$</Code> are plain text.</li>
                    </ul>
                    <ExampleCard hrefs={hrefs} example={recipes.find(r => r.id === "edges")!}
                                 summary={recipes.find(r => r.id === "edges")!.summary}/>
                </Section>

                <Section id="reference-output">
                    <Sub>Generator options</Sub>
                    <ul className="list-disc pl-6 flex flex-col gap-2">
                        <li>The number next to <b>Generate</b> sets how many words to make, from 1 to 10000.</li>
                        <li><b>Filter Duplicates</b> hides repeated words and shows how many are unique.</li>
                        <li><b>Output as list</b> shows one word per line instead of a paragraph. <b>Copy</b> copies the
                            words in the current layout.</li>
                        <li><b>Repeat rewrites until nothing changes</b> runs each rule's rewrite list until it stops
                            changing the output, instead of once (see Rewrites). It is saved in share links.</li>
                        <li><b>Enable serifs</b> switches to a serif font, which makes some IPA characters easier to read.</li>
                    </ul>

                    <Sub>Seed</Sub>
                    <p>The <b>Seed</b> field makes generation repeatable: the same seed and grammar always give the same
                        words, in the same order, and the seed is saved in share links so others see your exact list. Any
                        text works; the dice button picks a random one. Leave it empty to get new words on every{" "}
                        <b>Generate</b>. For example, the first grammar above with the seed <Code>{seedDemo.seed}</Code>{" "}
                        starts with <Code>{seedDemo.words.join(", ")}</Code>.</p>

                    <Sub>Live preview</Sub>
                    <p>With <b>Live preview</b> on (the default), the words update by themselves a quarter of a second
                        after each edit that leaves the grammar valid. They use the seed, or when it is empty a seed fixed
                        for the session (shown greyed in the field), so an edit shows how the same draws change rather than
                        a new random list. Live updates are not announced by screen readers, to avoid talking over your
                        typing; <b>Generate</b> still announces how many words it made. The setting is remembered in this
                        browser and is not part of share links.</p>

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
                    {recipes.filter(r => !["weighted", "awkwords", "edges"].includes(r.id)).map(r =>
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
                    <p>On the Generator page, <b>Import Awkwords</b> converts an Awkwords pattern into a Monke grammar. Choose
                        an <Code>.awkw</Code> file saved by Awkwords, or paste a pattern. To paste subpatterns as well, write
                        them one per line as a saved file does: <Code>V:a/i/u</Code>, then <Code>r:CV</Code> for the main
                        pattern. The import replaces the current grammar; the browser's Back button undoes it.</p>
                    <ul className="list-disc pl-6 flex flex-col gap-1">
                        <li>Each subpattern becomes a rule named by its letter, and the main pattern becomes the root
                            rule <Code>Word</Code>. Plain alternatives become terminal rules.</li>
                        <li>Brackets, optionals, escapes and weights are translated as in the table above. Weights are
                            enabled when the pattern uses any.</li>
                        <li>The number of words fills the word count; <b>filter duplicates</b> and <b>new line each</b> set
                            Filter Duplicates and Output as list.</li>
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
                    <p>When something does not translate exactly, the import lists notes under the import buttons until you
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

const awkwordsExample = recipes.find(r => r.id === "awkwords")!

const awkwordsRows: [ReactNode, ReactNode][] = [
    [<>Subpattern <Code>V</Code> with <Code>a/i/u</Code></>, <>Terminal rule <Code>V</Code> with terminals <Code>a</Code>, <Code>i</Code>, <Code>u</Code>. A subpattern with brackets, letters or filters becomes a rule with patterns instead. Any name works, not only capital letters.</>],
    [<>Pattern <Code>CV</Code></>, <>Root rule with the pattern <Code>C.V</Code></>],
    [<>Text such as <Code>ka</Code>; spaces are ignored</>, <>Quoted text: <Code>{"'ka'"}</Code>. A bare word is always a rule name.</>],
    [<>Escaped text <Code>{'"..."'}</Code>, with <Code>{'""'}</Code> for a double quote</>, <>Quoted text <Code>{"'...'"}</Code>, with <Code>{"\\'"}</Code> for a single quote and <Code>{"\\\\"}</Code> for a backslash.</>],
    [<>Alternatives <Code>ka/ta</Code></>, <><Code>{"'ka' / 'ta'"}</Code>. An empty alternative, as in <Code>{"[a/]"}</Code>, is <Code>{"''"}</Code>.</>],
    [<>Brackets <Code>[...]</Code></>, <>Group <Code>{"[...]"}</Code></>],
    [<>Optional <Code>(...)</Code>, present half of the time</>, <>Optional <Code>{"(...)"}</Code>, also half of the time. A choice inside needs a group: <Code>{"(['a' / 'b'])"}</Code></>],
    [<>Weight <Code>*n</Code>, a whole number from 1 to 128, anywhere in its alternative</>, <>Weight <Code>*N</Code> at the end of the alternative, used only when weights are enabled.</>],
    [<>Filter <Code>^text</Code> on the fragment before it</>, <>Exclusion on a rule that holds the fragment (see below).</>],
]
