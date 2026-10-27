import {renderToStaticMarkup} from "react-dom/server";
import {encodeConfig} from "@/engine/sharing.ts";
import {faqItems} from "@/features/docs/faqItems.tsx";
import {allExamples, exampleToConfig} from "@/features/docs/referenceExamples.ts";
import {siteOrigin, StaticPage, staticPages} from "./pages.ts";
import {NotFoundBody, StaticPageBody} from "./StaticPages.tsx";

// Loaded by the build (scripts/prerender.ts) through Vite's SSR loader, so it shares the app's modules and aliases.

export type RenderedPage = StaticPage & { body: string, jsonLd: object[] }

const text = (html: string) => html.replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim()

const faqJsonLd = () => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(item => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
            "@type": "Answer",
            // The answers' "(opens in a new tab)" hints are for screen readers following the links, not for a summary.
            text: text(renderToStaticMarkup(<>{item.answer}</>)).replace(/ \(opens in a new tab\)/g, ""),
        },
    })),
})

export const renderNotFound = () => renderToStaticMarkup(<NotFoundBody/>)

export const renderPages =async (): Promise<RenderedPage[]> => {
    // "Try it" links are share links to the live site, encoded once here instead of on mount.
    const hrefs = Object.fromEntries(await Promise.all(allExamples.map(async e =>
        [e.id, `${siteOrigin}/${await encodeConfig(exampleToConfig(e))}`] as const)))
    return staticPages.map(page => ({
        ...page,
        body: renderToStaticMarkup(<StaticPageBody page={page} hrefs={hrefs}/>),
        jsonLd: page.path === "/faq/" ? [faqJsonLd()] : [],
    }))
}
