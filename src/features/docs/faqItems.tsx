import {ReactNode} from "react";
import {External} from "./External.tsx";

// Shared by the in-app view and the prerendered /faq/ page, whose FAQPage JSON-LD is built from the same answers.
export const faqItems: { question: string, answer: ReactNode }[] = [
    {
        question: "What is this tool?",
        answer: <><b className="text-primary-text">Monke</b> is a free word generator for conlang creators. You describe
            the sound patterns of your language with rules, and it generates as many words as you need. It runs entirely in
            your browser. The Reference explains how to write the rules.</>,
    },
    {
        question: "Why the name Monke?",
        answer: <>The random words reminded me of the <External href="https://en.wikipedia.org/wiki/Infinite_monkey_theorem">infinite
            monkey theorem</External>.</>,
    },
    {
        question: "Can I use it for my own conlang?",
        answer: <>Absolutely, for anything you like.</>,
    },
    {
        question: "Can it do vowel harmony?",
        answer: <>Yes. Declare a feature such as harmony with the values front and back, give the vowels their values, and let
            the start rule choose harmony: every word then keeps to one side, while vowels without a value go with both. The
            Reference's Phonological features section has the details and a vowel harmony example, also in the Examples menu.</>,
    },
    {
        question: "Where is my grammar saved?",
        answer: <>Only in the page address and in the files you export. Nothing is sent to a server, so keep the link or an
            exported file to come back to your work.</>,
    },
    {
        question: "Where can I give feedback?",
        answer: <>To report a bug or suggest a feature, open an issue on the project's <External
            href="https://github.com/terahlunah/monke">GitHub repository</External>.</>,
    },
    {
        question: "Who made it?",
        answer: <>I'm Terah, a software engineer who likes writing tools for my hobbies, like conlangs. My other projects are
            on my <External href="https://github.com/terahlunah">GitHub page</External>.</>,
    },
    {
        question: "This is a bit complex. Are there alternatives?",
        answer: <>Start with the Reference's quick start and recipes; most grammars only need a few rules. If it's still not for
            you, try <External href="https://wrdz-7570a.web.app/">Wrdz</External> by Collin Brennan, a word generator with a
            simpler interface and one of Monke's inspirations.</>,
    },
]
