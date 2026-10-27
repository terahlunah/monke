// Checks the build output: run after `npm run build` (Node strips the types itself).
import {readFile} from "node:fs/promises"
import {join} from "node:path"
import {JSDOM} from "jsdom"
import {entryId, feedPath} from "../src/site/feed.ts"
import {releaseAnchor, releases} from "../src/site/releases.ts"
import {notFoundPage, siteOrigin, staticPages} from "../src/site/pages.ts"

const outDir = process.argv[2] ?? ".cloudflare/output/v0/workers/default/assets"
const failures: string[] = []
const read = (file: string) => readFile(join(outDir, file), "utf8").catch(() => {
    failures.push(`missing ${file}`)
    return ""
})

// React escapes apostrophes in text; page titles and headings may contain them.
const unescape = (s: string) => s.replace(/&#x27;/g, "'")

for (const page of staticPages) {
    const file = `${page.path.slice(1)}index.html`
    const html = await read(file)
    if (!html) continue
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? []
    if (h1.length !== 1 || !unescape(h1[0]).includes(page.heading)) failures.push(`${file}: expected one h1 "${page.heading}"`)
    if (!html.includes(`<link rel="canonical" href="${siteOrigin}${page.path}"/>`)) failures.push(`${file}: canonical`)
    if (!unescape(html).includes(`<title>${page.title}</title>`)) failures.push(`${file}: title`)
    if (/<script type="module"/.test(html)) failures.push(`${file}: app bundle should not load`)
    if (html.replace(/<[^>]+>/g, "").length < 1000) failures.push(`${file}: too little text`)
}

// The news page links each release by anchor, and the feed (read as XML, which fails on malformed markup) lists them all.
const news = await read("news/index.html")
for (const r of releases) if (!news.includes(`id="${releaseAnchor(r)}"`)) failures.push(`news/index.html: missing release ${r.version}`)
const feedText = await read(feedPath.slice(1))
if (feedText) {
    try {
        const feed = new JSDOM(feedText, {contentType: "application/xml"}).window.document
        const ids = [...feed.querySelectorAll("entry > id")].map(e => e.textContent)
        if (feed.documentElement.localName !== "feed") failures.push("news/feed.xml: root must be feed")
        if (JSON.stringify(ids) !== JSON.stringify(releases.map(entryId))) failures.push("news/feed.xml: entries must match the releases")
        if (feed.querySelector("feed > updated")?.textContent !== `${releases[0].date}T00:00:00Z`) failures.push("news/feed.xml: updated must be the newest release")
    } catch (e) {
        failures.push(`news/feed.xml: not well-formed XML: ${e}`)
    }
}
const sitemap = await read("sitemap.xml")
if (!sitemap.includes(`<loc>${siteOrigin}/news/</loc><lastmod>${releases[0].date}</lastmod>`)) failures.push("sitemap.xml: /news/ lastmod must be the newest release date")
const headers = await readFile("public/_headers", "utf8")
const feedHeaders = headers.split(/\r?\n\s*\r?\n/).find(block => block.startsWith(feedPath))
if (!feedHeaders?.includes("Content-Type: application/atom+xml")) failures.push("_headers: feed.xml must be application/atom+xml")

const index = await read("index.html")
if (!index.includes(`<link rel="canonical" href="${siteOrigin}/"/>`)) failures.push("index.html: canonical")
if (!index.includes('<link rel="alternate" type="application/atom+xml"')) failures.push("index.html: feed link")
if (index.includes("__ANALYTICS_PAGE_URL__")) failures.push("index.html: analytics sanitizer not inlined")
if (!/<link rel="preload" href="\/assets\/[^"]+\.woff2"/.test(index)) failures.push("index.html: font preload")
if (!(await read("faq/index.html")).includes('"@type":"FAQPage"')) failures.push("faq: FAQPage JSON-LD")
const notFound = await read(notFoundPage.file)
if (notFound && !notFound.includes(notFoundPage.heading)) failures.push(`${notFoundPage.file}: heading`)
if (notFound && !notFound.includes('<meta name="robots" content="noindex"/>')) failures.push(`${notFoundPage.file}: noindex`)
if (/rel="canonical"|<script type="module"/.test(notFound)) failures.push(`${notFoundPage.file}: should have no canonical or app bundle`)

// The shape required by the ARD ai-catalog schema (specVersion "1.0", entries, host with displayName and only known
// keys), which Lighthouse's agentic audit validates.
const catalogFile = ".well-known/ai-catalog.json"
const catalogText = await read(catalogFile)
if (catalogText) {
    try {
        const catalog = JSON.parse(catalogText)
        const hostKeys = ["displayName", "identifier", "documentationUrl", "logoUrl", "trustManifest"]
        if (catalog.specVersion !== "1.0") failures.push(`${catalogFile}: specVersion must be "1.0"`)
        if (!Array.isArray(catalog.entries)) failures.push(`${catalogFile}: entries must be an array`)
        if (Object.keys(catalog).some(k => !["specVersion", "host", "entries"].includes(k))) failures.push(`${catalogFile}: unknown top-level key`)
        if (catalog.host && (typeof catalog.host.displayName !== "string" || Object.keys(catalog.host).some(k => !hostKeys.includes(k)))) failures.push(`${catalogFile}: host`)
        for (const url of [catalog.host?.documentationUrl, catalog.host?.logoUrl]) {
            if (url && !(url.startsWith(`${siteOrigin}/`) && await read(url.slice(siteOrigin.length + 1)))) failures.push(`${catalogFile}: ${url} not in the build`)
        }
    } catch (e) {
        failures.push(`${catalogFile}: ${e}`)
    }
}

for (const file of ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "site.webmanifest"]) await read(file)

if (failures.length) {
    console.error(`Prerender check failed:\n- ${failures.join("\n- ")}`)
    process.exit(1)
}
console.log(`Prerender check passed: ${staticPages.length} pages`)
