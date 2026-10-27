import {type Release, releaseAnchor} from "./releases.ts";
import {siteOrigin} from "./pages.ts";

export const feedPath = "/news/feed.xml"
export const newsPath = "/news/"

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// tag: URIs (RFC 4151) stay valid and unique if the site ever moves, unlike ids built from URLs.
export const entryId = (r: Release) => `tag:monke.lunah.dev,${r.date}:${r.version}`

// Atom 1.0. `renderBody` gives each release's HTML, which goes in the entry as escaped markup (type="html").
export const atomFeed = (releases: Release[], renderBody: (r: Release) => string): string => {
    const updated = `${releases[0].date}T00:00:00Z`
    const entries = releases.map(r => `  <entry>
    <id>${entryId(r)}</id>
    <title>Monke v${escapeXml(r.version)}</title>
    <link rel="alternate" type="text/html" href="${siteOrigin}${newsPath}#${releaseAnchor(r)}"/>
    <updated>${r.date}T00:00:00Z</updated>
    <content type="html">${escapeXml(renderBody(r))}</content>
  </entry>`).join("\n")
    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>tag:monke.lunah.dev,2024:news</id>
  <title>Monke release notes</title>
  <subtitle>What's new in Monke, the conlang word generator.</subtitle>
  <link rel="self" type="application/atom+xml" href="${siteOrigin}${feedPath}"/>
  <link rel="alternate" type="text/html" href="${siteOrigin}${newsPath}"/>
  <updated>${updated}</updated>
  <author><name>Terah</name><uri>https://github.com/terahlunah</uri></author>
${entries}
</feed>
`
}
