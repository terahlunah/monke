import {describe, expect, it} from "vitest";
import {defaultConfig} from "@/engine/defaults.ts";
import {encodeConfig} from "@/engine/sharing.ts";
import {analyticsPageUrl, configSegment, staticPages} from "./pages.ts";

const paths = staticPages.map(p => p.path)

describe("configSegment", () => {
    it.each(paths)("never reads static page %s as a config", path => {
        expect(configSegment(path)).toBe("")
        expect(configSegment(path.slice(0, -1))).toBe("")
    })

    it.each(["/", "/robots.txt", "/sitemap.xml", "/llms.txt", "/assets/index.js", "/a/b"])("ignores %s", path => {
        expect(configSegment(path)).toBe("")
    })

    it("reads a share link", async () => {
        const data = await encodeConfig(defaultConfig)
        expect(configSegment(`/${data}`)).toBe(data)
    })
})

describe("analyticsPageUrl", () => {
    const origin = "https://monke.lunah.dev"

    it("keeps the home page and static pages", () => {
        expect(analyticsPageUrl(`${origin}/`, paths)).toBe(`${origin}/`)
        for (const p of paths) expect(analyticsPageUrl(`${origin}${p}?q=1#x`, paths)).toBe(`${origin}${p}`)
    })

    it("hides a share link", async () => {
        const data = await encodeConfig(defaultConfig)
        const reported = analyticsPageUrl(`${origin}/${data}?utm_source=x`, paths)
        expect(reported).toBe(`${origin}/shared`)
        expect(reported).not.toContain(data)
    })

    it("hides any other path", () => {
        expect(analyticsPageUrl(`${origin}/faq/extra`, paths)).toBe(`${origin}/shared`)
    })

    it("runs from its own source, as the build inlines it", () => {
        const inlined = new Function(`return (${analyticsPageUrl.toString()})`)() as typeof analyticsPageUrl
        expect(inlined(`${origin}/abc`, paths)).toBe(`${origin}/shared`)
    })
})
