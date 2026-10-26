import {ScrollRegion} from "@/components/ScrollRegion.tsx";
import {Col} from "@/components/Col.tsx";
import {GenericProps} from "@/components/GenericProps.tsx";

const linkClass = "text-primary-text underline"

export const Faq = () => {

    return (
        <ScrollRegion label="FAQ" className="flex flex-col bg-background grow p-4 md:p-8 gap-10 md:no-scrollbar justify-start">
            <FaqItem title="What is this tool?">
                <b className="text-primary-text">Monke</b> is a word generator for conlang creators. You describe the
                sound patterns of your language with rules, and it generates as many words as you need. The Reference explains
                how to write the rules.
            </FaqItem>
            <FaqItem title="Why the name Monke?">
                The random words reminded me of the <a className={linkClass}
                href="https://en.wikipedia.org/wiki/Infinite_monkey_theorem" target="_blank" rel="noreferrer noopener">infinite
                monkey theorem<span className="sr-only"> (opens in a new tab)</span></a>.
            </FaqItem>
            <FaqItem title="Can I use it for my own conlang?">
                Absolutely, for anything you like.
            </FaqItem>
            <FaqItem title="Where is my grammar saved?">
                Only in the page address and in the files you export. Nothing is sent to a server, so keep the link or an
                exported file to come back to your work.
            </FaqItem>
            <FaqItem title="Where can I give feedback?">
                To report a bug or suggest a feature, open an issue on the project's <a className={linkClass}
                href="https://github.com/terahlunah/monke" target="_blank" rel="noreferrer noopener">GitHub repository<span
                className="sr-only"> (opens in a new tab)</span></a>.
            </FaqItem>
            <FaqItem title="Who made it?">
                I'm Terah, a software engineer who likes writing tools for my hobbies, like conlangs. My other projects are
                on my <a className={linkClass} href="https://github.com/terahlunah" target="_blank"
                         rel="noreferrer noopener">GitHub page<span className="sr-only"> (opens in a new tab)</span></a>.
            </FaqItem>
            <FaqItem title="This is a bit complex. Are there alternatives?">
                Start with the Reference's quick start and recipes; most grammars only need a few rules. If it's still not for
                you, try <a className={linkClass} href="https://wrdz-7570a.web.app/" target="_blank"
                            rel="noreferrer noopener">Wrdz<span className="sr-only"> (opens in a new tab)</span></a> by
                Collin Brennan, a word generator with a simpler interface and one of Monke's inspirations.
            </FaqItem>
        </ScrollRegion>
    )
}

const FaqItem = ({title, children}: GenericProps<{ title: string }>) => {
    return (
        <Col className="gap-3 max-w-3xl w-full mx-auto">
            <h2 className="text-2xl md:text-3xl">{title}</h2>
            <p className="text-lg">{children}</p>
        </Col>
    )
}
