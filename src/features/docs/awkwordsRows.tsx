import {ReactNode} from "react";
import {Code} from "./Code.tsx";

export const awkwordsRows: [ReactNode, ReactNode][] = [
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
