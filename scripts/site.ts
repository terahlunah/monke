import {readFile, writeFile, mkdir} from "node:fs/promises"
import {join, resolve} from "node:path"
import {createServer, Plugin, ResolvedConfig} from "vite"
import react from "@vitejs/plugin-react"
import {analyticsPageUrl, notFoundPage, siteOrigin, staticPages} from "../src/site/pages.ts"
import type {RenderedPage} from "../src/site/prerender.tsx"

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

// Turns the static markup into Markdown for llms-full.txt. The markup is our own and regular, so a few patterns do.
export const htmlToMarkdown = (html: string): string => html
    .replace(/<(header|footer|nav)[\s\S]*?<\/\1>/g, "")
    .replace(/<a href="#content"[\s\S]*?<\/a>/, "")
    .replace(/<span class="sr-only">[^<]*<\/span>/g, "")
    .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n, t) => `\n\n${"#".repeat(Number(n))} ${t}\n\n`)
    .replace(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/g, "\n\n```\n$1\n```\n\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => `[${t}](${href.startsWith("/") ? siteOrigin + href : href})`)
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/g, "**$2**")
    .replace(/<li[^>]*>/g, "\n- ")
    .replace(/<\/t[hd]>/g, " | ")
    .replace(/<tr[^>]*>/g, "\n| ")
    .replace(/<(p|ul|ol|table|figure|caption|div)[^>]*>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const pageMeta = (page: RenderedPage) => {
    const url = siteOrigin + page.path
    return [
        `<title>${escapeAttr(page.title)}</title>`,
        `<meta name="description" content="${escapeAttr(page.description)}"/>`,
        `<link rel="canonical" href="${url}"/>`,
        `<meta property="og:url" content="${url}"/>`,
        `<meta property="og:title" content="${escapeAttr(page.title)}"/>`,
        `<meta property="og:description" content="${escapeAttr(page.description)}"/>`,
        ...page.jsonLd.map(data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`),
    ]
}

// Served at whatever address was missing, so it has no canonical or og:url.
const notFoundMeta = [
    `<title>${escapeAttr(notFoundPage.title)}</title>`,
    `<meta name="description" content="${escapeAttr(notFoundPage.description)}"/>`,
    `<meta name="robots" content="noindex"/>`,
]

const pageHtml = (template: string, path: string, meta: string[], body: string) => {
    const html = template
        .replace(/<!-- page-meta:[\s\S]*?<!-- \/page-meta -->/, meta.join("\n    "))
        // Static pages are plain documents: no app bundle, no fallback for it.
        .replace(/<script type="module"[^>]*><\/script>/g, "")
        .replace(/<link rel="modulepreload"[^>]*>/g, "")
        .replace(/<noscript>[\s\S]*?<\/noscript>/, "")
        .replace(/<div id="root"><\/div>/, body)
    if (html.includes('<div id="root">') || html.includes("page-meta")) throw new Error(`Prerender of ${path}: template markers not found`)
    return html
}

// Inlines the analytics sanitizer into index.html, preloads the main font, and after the client build prerenders the
// static pages from the same React components the app uses, so their text can't drift from the in-app views.
export const site = (): Plugin => {
    let config: ResolvedConfig
    return {
        name: "monke-site",
        configResolved(c) {
            config = c
        },
        transformIndexHtml: {
            // After Vite's own transform, so the build's bundle (and the hashed font name) is available.
            order: "post",
            handler(html, ctx) {
                const paths = JSON.stringify(staticPages.map(p => p.path))
                html = html.replace("__ANALYTICS_PAGE_URL__",
                    `function (href) { return (${analyticsPageUrl.toString()})(href, ${paths}); }`)
                const font = Object.values(ctx.bundle ?? {}).find(f => f.type === "asset" && /noto-sans-latin-wght-normal.*\.woff2$/.test(f.fileName))
                if (!ctx.bundle) return html
                if (!font) throw new Error("Main font asset not found for preload")
                return {
                    html,
                    tags: [{
                        tag: "link",
                        attrs: {rel: "preload", href: `/${font.fileName}`, as: "font", type: "font/woff2", crossorigin: ""},
                        injectTo: "head",
                    }],
                }
            },
        },
        async closeBundle() {
            // The Cloudflare plugin moves the client output, so read it from the environment rather than the top-level config.
            if (config.command !== "build" || this.environment.name !== "client") return
            const outDir = resolve(config.root, this.environment.config.build.outDir)
            const template = await readFile(join(outDir, "index.html"), "utf8")

            const server = await createServer({
                configFile: false,
                root: config.root,
                logLevel: "error",
                plugins: [react()],
                resolve: {alias: config.resolve.alias},
                server: {middlewareMode: true, hmr: false, ws: false},
                appType: "custom",
                optimizeDeps: {noDiscovery: true, include: []},
            })
            try {
                const {renderPages, renderNotFound} = await server.ssrLoadModule("/src/site/prerender.tsx") as typeof import("../src/site/prerender.tsx")
                const pages = await renderPages()
                for (const page of pages) {
                    const dir = join(outDir, page.path)
                    await mkdir(dir, {recursive: true})
                    await writeFile(join(dir, "index.html"), pageHtml(template, page.path, pageMeta(page), page.body))
                }
                await writeFile(join(outDir, notFoundPage.file), pageHtml(template, notFoundPage.path, notFoundMeta, renderNotFound()))
                const llms = await readFile(join(config.root, "public", "llms.txt"), "utf8")
                const full = [llms.trim(), ...pages.map(p => `# ${siteOrigin}${p.path}\n\n${htmlToMarkdown(p.body)}`)].join("\n\n---\n\n")
                await writeFile(join(outDir, "llms-full.txt"), full + "\n")
                config.logger.info(`Prerendered ${pages.map(p => p.path).join(", ")} and llms-full.txt`)
            } finally {
                await server.close()
            }
        },
    }
}
