import {ScrollRegion} from "@/components/ScrollRegion.tsx";
import {Col} from "@/components/Col.tsx";
import {faqItems} from "./faqItems.tsx";

export const Faq = () => (
    <ScrollRegion label="FAQ" className="flex flex-col bg-background grow p-4 pb-20 md:p-8 gap-10 md:no-scrollbar justify-start">
        <FaqList/>
    </ScrollRegion>
)

export const FaqList = () => (
    <>
        {faqItems.map(item => (
            <Col key={item.question} className="gap-3 max-w-3xl w-full mx-auto">
                <h2 className="text-2xl md:text-3xl">{item.question}</h2>
                <p className="text-lg">{item.answer}</p>
            </Col>
        ))}
    </>
)
