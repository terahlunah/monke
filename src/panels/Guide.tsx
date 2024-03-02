import {Col} from "../components/Col.tsx";
import {ChevronDoubleRightIcon, EllipsisVerticalIcon, XMarkIcon} from "@heroicons/react/24/outline";
import {Row} from "../components/Row.tsx";
import AutowidthInput from "react-autowidth-input";
import {SwitchLabel} from "../components/SwitchLabel.tsx";

export const Guide = () => {

    return (
        <Col className="bg-background grow p-8 gap-2 md:overflow-auto md:no-scrollbar pb-64">
            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Grammar</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>

            <p>Monke uses a powerful and flexible rule based grammar to configure the generator.</p>
            <p>The grammar is made up of rules. The start rule is the entry point for the generator.</p>

            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Terminal Rule</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>

            <p>Terminal rules are used to define the "terminals" of the grammar, which are usually the
                "letters"/"symbols" of your language.</p>
            <p>The name is used to reference this Terminal Rule in other Rules</p>
            <span className=" rounded bg-primary/40 py-2 px-4 w-min">Vowel</span>
            <p>The terminals defined in a Terminal Rule will be picked at random when a rule is
                referenced.</p>
            <Row className="gap-4">
                <GuideTerminal value="a"/>
                <GuideTerminal value="u"/>
            </Row>
            <p>Here the letter "a" and "u" have each 50% chance of being used when generating this Terminal
                Rule.</p>
            <Row className="gap-4">
                <GuideTerminal value="ch"/>
                <GuideTerminal value="好"/>
            </Row>
            <p>The terminals can contain multiple letters and non-ascii characters.</p>

            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Rule</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>

            <p>Rules are more general and powerful than Terminal Rules. A Rule also has a name which can be
                referenced by other rules.</p>
            <span className=" rounded bg-secondary/40 py-2 px-4 w-min">Vowel</span>
            <p>Patterns can be added to a Rule, they will be chosen at random when this rule is
                generated like for Terminal Rules.</p>
            <Row className="gap-4">
                <GuidePattern value="Consonant.Vowel.('n')"/>
            </Row>
            <p>Each Pattern contains a single Expression. Here it's "Consonant.Vowel.('n')".</p>


            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Expression</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <p>Expressions are the main component of the generator, they are used by Patterns, Rewrites and
                Exclusions. They allow Rules to reference other Rules and Terminal Rules.</p>

            <p>An expression is made up of different kind of terms:</p>

            <Col className="list-disc list-inside gap-4 mt-4">
                <li>
                    <b>Reference</b>
                    <Col className="gap-2 my-2">
                        <p>These are names of other Rules or Terminal Rules. The referenced Rule will be
                            used for the generation.</p>
                        <Row className="gap-4">
                            <GuidePattern value="Vowel"/>
                            <GuidePattern value="Syllable"/>
                        </Row>

                    </Col>
                </li>
                <li>
                    <b>Terminal</b>
                    <Col className="gap-2 my-2">
                        <p>They can be used to generate a single terminal without needing to create a
                            dedicated terminal rule for it. You MUST surround the terminal by single quotes.</p>
                        <Row className="gap-4">
                            <GuidePattern value="'a'"/>
                            <GuidePattern value="'u'"/>
                        </Row>
                    </Col>
                </li>
                <li>
                    <b>Sequence</b>
                    <Col className="gap-2 my-2">
                        <p>To represent a sequence of expressions, use a dot "." to separate the terms. On
                            generation, each sub expression will be generate successively and the result is
                            a sequence of all their generated terminals.</p>
                        <GuidePattern value="Vowel.Vowel"/>
                        <p>Using the definition of Vowel above, this will generate randomly one of the
                            following words: "aa", "au", "ua" or "uu"</p>
                    </Col>
                </li>
                <li>
                    <b>Group</b>
                    <Col className="gap-2 my-2">
                        <p>Group syntax allow the creation of "inline rules", or sub-expressions. They are made by
                            surrounding an expression with "[" and "]".</p>
                        <GuidePattern value="[Vowel.Vowel]"/>
                        <p>In this example, using a group wouldn't change anything, but they are needed for more complex
                            expressions like Choice or Quantifier.</p>
                    </Col>
                </li>
                <li>
                    <b>Choice</b>
                    <Col className="gap-2 my-2">
                        <p>Instead of having to duplicate similar patterns, inline choices can be used. They
                            use the symbol "/" and have less priority than anything else, that's why it must be inside a
                            Group when used alongside other expressions.</p>
                        <Row className="gap-4">
                            <GuidePattern value="Vowel.['j'/'w']"/>
                        </Row>
                        <p>This single pattern is the equivalent of the 2 following patterns:</p>
                        <Row className="gap-4">
                            <GuidePattern value="Vowel.'j'"/>
                            <GuidePattern value="Vowel.'w'"/>
                        </Row>
                    </Col>
                </li>
                <li>
                    <b>Quantifier</b>
                    <Col className="gap-2 my-2">
                        <p>Quantifiers makes it easier to repeat an expression multiple times with randomness. They have
                            the general form:</p>
                        <GuidePattern value="'a'{min:max}"/>
                        <p>min and max are number defining the range of
                            repetition, max must be greater or equal to min.</p>
                        <p>Here are a few examples:</p>
                        <GuidePattern value="'a'{1:3}"/>
                        <p>This expression means "the letter 'a' repeated between 1 and 3 times", and will generate
                            the following words: "a", "aa" or "aaa"</p>
                        <Row className="gap-4">
                            <GuidePattern value="'a'{0:2}"/>
                            <GuidePattern value="'a'{:2}"/>
                        </Row>
                        <p>These expressions are equivalent, when min equals 0, it can be omitted. It means "the
                            letter 'a' repeated between 0 and 2 times"</p>
                        <Row className="gap-4">
                            <GuidePattern value="'a'{2:2}"/>
                            <GuidePattern value="'a'{2}"/>
                        </Row>
                        <p>These expressions are equivalent, when min equals max, it can be shorted to just the number.
                            It means "the
                            letter 'a' repeated exactly 2 times"</p>
                    </Col>
                </li>
                <li>
                    <b>Option</b>
                    <Col className="gap-2 my-2">
                        <p>Option allow to mark an expression an optional in the generation. Similar to a group, the
                            expression just needs to be surrounded by "(" and ")"</p>
                        <GuidePattern value="('a')"/>
                        <p>It is equivalent to the following quantifier syntax.</p>
                        <GuidePattern value="'a'{:1}"/>
                        <p>But since it's so common, it's easier to use the Option syntax.</p>
                    </Col>
                </li>
            </Col>

            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Rewrite</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <p>Rewrites are expression than can be used to transform the output of a rule. They can be enabled
                separately on each rule by clicking on the Rewrite button</p>
            <span className="p-1 rounded min-w-8 bg-accent-warning w-min">Rw</span>
            <p>Once enabled, rewrites can be added to the rule. A rewrite consist of 2 part, a "match" and a
                "replacement".</p>
            <Row className="gap-4">
                <GuideRewrite match="'a'" replace="'u'"/>
            </Row>
            <p>The "match" expression will try to match a subset of the generated output of a rule at any position. For
                example, if the output of a rule is "nap". This rewrite would match the 'a' part and change it using the
                output of the "replacement" part to 'u' to
                produce "nup".</p>
            <p>Any expression can be used in both the "match" and the "replacement".</p>

            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Exclusion</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <p>Exclusions are expression than can be used to cancel the output of a rule an disallow certain
                combinations of terminals. They can be enabled
                separately on each rule by clicking on the Exclusion button</p>
            <span className="p-1 rounded min-w-8 bg-accent-caution w-min">Ex</span>
            <p>Once enabled, exclusions can be added to the rule. An exclusion contains a "match" expression.</p>
            <Row className="gap-4">
                <GuideExclusion match="'a'"/>
            </Row>
            <p>The "match" expression will try to match a subset of the generated output of a rule at any position. For
                example, if the output of a rule is "nap". This exclusion would not allow this output.</p>
            <p>Any expression can be used in the "match".</p>

            <Row className="items-baseline justify-between gap-4 mt-4 grow">
                <h1 className="font-bold text-xl">Weight Probabilities</h1>
                <div className="h-0.5 bg-white/10 grow"/>
            </Row>
            <p>Probability weight can be enabled using the toggle on the top right.</p>
            <SwitchLabel checked={true} onChange={() => {
            }}
                         label="Enable probability weights"
                         enabledColor="bg-accent-warning" disabledColor="bg-accent-warning/30"/>
            <p>When enabled, each rule pattern will display a editable weight next to the expression.</p>
            <Row className="gap-4">
                <GuideTerminal value="a" weight="1"/>
                <GuidePattern value="Vowel" weight="1"/>
            </Row>
            <p>Weights have default value of 1 and are taken into account when pick different patterns.</p>
            <p>Weights can also be specified in choices using "*" after the expression.</p>
            <Row className="gap-4">
                <GuidePattern value="'a' / 'b'*2"/>
            </Row>
            <p>This pattern is the equivalent of the following patterns</p>
            <Row className="gap-4">
                <GuidePattern value="'a'" weight="1"/>
                <GuidePattern value="'b'" weight="2"/>
            </Row>
            <p>Weight are relatives and not absolute, so the following patterns are equivalents. Choose the simplest
                form for your needs.</p>
            <Row className="gap-4">
                <GuidePattern value="'a' / 'b'*2"/>
                <GuidePattern value="'a'*0.5 / 'b'"/>
            </Row>
            <p>Tip: If you want to temporarily disable a pattern, just set its weight to 0.</p>
            <Row className="gap-4">
                <GuidePattern value="'a'" weight="0"/>
            </Row>
        </Col>
    )
}

const GuideTerminal = ({value, weight}: { value: string, weight?: string }) => {
    return (
        <Row className={`rounded overflow-clip w-min h-8 items-center`}>
            <button className={`bg-primary p-1 h-8`}>
                <EllipsisVerticalIcon className="h-4"/>
            </button>
            <AutowidthInput value={value}
                            className={`bg-primary/40 px-1 outline-0 text-center h-8`}
                            type="text"
                            minWidth={15}/>
            {weight ?
                <AutowidthInput value={weight}
                                className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                                type="text"
                                minWidth={10}/> : null
            }
            <button className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/>
            </button>
        </Row>
    )
}

const GuidePattern = ({value, weight}: { value: string, weight?: string }) => {
    return (
        <Row className={`rounded overflow-clip w-min h-8 items-center`}>
            <button className={`bg-secondary p-1 h-8`}>
                <EllipsisVerticalIcon className="h-4"/>
            </button>
            <AutowidthInput value={value}
                            className={`bg-secondary/40 px-1 outline-0 text-center h-8`}
                            type="text"
                            minWidth={15}/>
            {weight ?
                <AutowidthInput value={weight}
                                className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                                type="text"
                                minWidth={10}/> : null
            }
            <button className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/></button>
        </Row>
    )
}

const GuideRewrite = ({match, replace}: { match: string, replace: string }) => {
    return (
        <Row className={`rounded overflow-clip w-min h-8 items-center`}>
            <button className={`bg-accent-warning p-1 h-8`}>
                <EllipsisVerticalIcon className="h-4"/>
            </button>
            <AutowidthInput value={match}
                            className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                            type="text"
                            minWidth={15}/>
            <button className="bg-accent-warning p-1 h-8"><ChevronDoubleRightIcon className="h-4"/></button>
            <AutowidthInput value={replace}
                            className={`bg-accent-warning/40 px-1 outline-0 text-center h-8`}
                            type="text"
                            minWidth={15}/>
            <button className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/>
            </button>
        </Row>
    )
}

const GuideExclusion = ({match}: { match: string }) => {
    return (
        <Row className={`rounded overflow-clip w-min h-8 items-center`}>
            <button className={`bg-accent-caution p-1 h-8`}>
                <EllipsisVerticalIcon className="h-4"/>
            </button>
            <AutowidthInput value={match}
                            className={`bg-accent-caution/40 px-1 outline-0 text-center h-8`}
                            type="text"
                            minWidth={15}/>
            <button className="bg-accent-danger/60 p-1 h-8"><XMarkIcon className="h-4"/>
            </button>
        </Row>
    )
}