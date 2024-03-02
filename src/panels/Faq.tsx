import {Col} from "../components/Col.tsx";
import {GenericProps} from "../components/GenericProps.tsx";

export const Faq = () => {

    return (
        <Col className="bg-background grow p-8 gap-12 md:overflow-auto md:no-scrollbar justify-start">
            <FaqItem title="What is this tool ?">
                <b className="text-primary">Monke</b> is a word generator mainly aimed at helping conlang creators build
                a vocabulary
                for their language.
            </FaqItem>
            <FaqItem title="Why the name Monke ?">
                I chose the name <b className="text-primary">Monke</b> because the generation of random words reminded
                me of the <a
                className="text-primary underline"
                href="https://en.wikipedia.org/wiki/Infinite_monkey_theorem" target="_blank" rel="noreferrer noopener">infinite
                monkey theorem.</a>
            </FaqItem>
            <FaqItem title="Can I use it for my own conlang ?">
                Absolutely, feel free to use if for all the use cases you may have in mind.
            </FaqItem>
            <FaqItem title="Where can I give some feedback ?">
                If you have an problem with the tool or found a bug, or if you want to propose new features, the best
                way to do so is to open a new issue on the project's <a
                className="text-primary underline"
                href="https://github.com/terahlunah/monke"
                target="_blank"
                rel="noreferrer noopener">Github</a> repository.
            </FaqItem>
            <FaqItem title="Who is the creator ?">
                My internet name is Terah, I'm a software engineer and I like to write tools for my hobbies, like
                conlangs.<br/> You can find my other projects on my personal <a
                className="text-primary underline"
                href="https://github.com/terahlunah"
                target="_blank"
                rel="noreferrer noopener">Github</a> page.
            </FaqItem>
            <FaqItem title="This tool is a bit complex, are there alternatives ?">
                I understand the expressions may be a bit intimidating at first, but try to give it a shot. If it's
                really not for you, you can try <a
                className="text-primary underline"
                href="https://wrdz-7570a.web.app/"
                target="_blank"
                rel="noreferrer noopener">Wrdz</a> by Collin Brennan, it's another word generator that has a simpler
                interface and was one of the inspiration for this tool.
            </FaqItem>
        </Col>
    )
}

const FaqItem = ({title, children}: GenericProps<{ title: string }>) => {
    return (
        <Col className="max-w-1/2 gap-4">
            <h1 className="text-3xl">{title}</h1>
            <p className="text-lg">{children}</p>
        </Col>
    )
}
