// Checks the build output: run after `npm run build` (Node strips the types itself).
import {readFile} from "node:fs/promises"
import {join} from "node:path"
import {notFoundPage, siteOrigin, staticPages} from "../src/site/pages.ts"

const outDir = process.argv[2] ?? ".cloudflare/output/v0/workers/default/assets"
const failures: string[] = []
const read = (file: string) => readFile(join(outDir, file), "utf8").catch(() => {
    failures.push(`missing ${file}`)
    return ""
})

for (const page of staticPages) {
    const file = `${page.path.slice(1)}index.html`
    const html = await read(file)
    if (!html) continue
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? []
    if (h1.length !== 1 || !h1[0].includes(page.heading)) failures.push(`${file}: expected one h1 "${page.heading}"`)
    if (!html.includes(`<link rel="canonical" href="${siteOrigin}${page.path}"/>`)) failures.push(`${file}: canonical`)
    if (!html.includes(`<title>${page.title}</title>`)) failures.push(`${file}: title`)
    if (/<script type="module"/.test(html)) failures.push(`${file}: app bundle should not load`)
    if (html.replace(/<[^>]+>/g, "").length < 1000) failures.push(`${file}: too little text`)
}

const index = await read("index.html")
if (!index.includes(`<link rel="canonical" href="${siteOrigin}/"/>`)) failures.push("index.html: canonical")
if (index.includes("__ANALYTICS_PAGE_URL__")) failures.push("index.html: analytics sanitizer not inlined")
if (!/<link rel="preload" href="\/assets\/[^"]+\.woff2"/.test(index)) failures.push("index.html: font preload")
if (!(await read("faq/index.html")).includes('"@type":"FAQPage"')) failures.push("faq: FAQPage JSON-LD")
const notFound = await read(notFoundPage.file)
if (notFound && !notFound.includes(notFoundPage.heading)) failures.push(`${notFoundPage.file}: heading`)
if (notFound && !notFound.includes('<meta name="robots" content="noindex"/>')) failures.push(`${notFoundPage.file}: noindex`)
if (/rel="canonical"|<script type="module"/.test(notFound)) failures.push(`${notFoundPage.file}: should have no canonical or app bundle`)

for (const file of ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "site.webmanifest"]) await read(file)

if (failures.length) {
    console.error(`Prerender check failed:\n- ${failures.join("\n- ")}`)
    process.exit(1)
}
console.log(`Prerender check passed: ${staticPages.length} pages`)
