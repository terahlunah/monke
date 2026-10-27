// Prerendered pages. Their paths contain '/', which never occurs in a share link, so they can't collide
// with a config. The SPA never runs on them: the static file wins over the single-page fallback.
export const staticPages = [
    {
        path: "/reference/",
        title: "Monke Reference – Conlang Word Generator Pattern Syntax",
        heading: "Monke reference",
        description: "How to write Monke grammars: rules, pattern syntax, weights, optionals, quantifiers, rewrites with back-references, exclusions, word boundaries, and recipes for common phonotactics.",
    },
    {
        path: "/faq/",
        title: "Monke FAQ – Free Conlang Word Generator",
        heading: "Monke FAQ",
        description: "Answers about Monke, the free browser-based word generator for conlangs: what it does, where your grammar is saved, and where to give feedback.",
    },
    {
        path: "/awkwords-alternative/",
        title: "Awkwords Alternative – Monke Conlang Word Generator",
        heading: "Monke as an Awkwords alternative",
        description: "Coming from Awkwords? Monke reads Awkwords patterns and .awkw files, and maps subpatterns, brackets, optionals, weights and filters to rules and exclusions.",
    },
] as const

export type StaticPage = typeof staticPages[number]

// Served by the Worker (with status 404) for any path that is neither a file nor a share link. Not listed with the
// static pages: it is not navigable, indexed or in the sitemap. The Worker requests it as `path` (the html handling
// serves 404.html there).
export const notFoundPage = {
    path: "/404",
    file: "404.html",
    title: "Page not found – Monke",
    heading: "Page not found",
    description: "There is no page at this address. Share links to a grammar are a single segment after the domain; check that the link was copied whole.",
} as const

export const siteOrigin = "https://monke.lunah.dev"

// The share link held by a URL path, or "" when the path can't be one (a static page, a file, a nested path).
// Static page names without their slash are excluded too: the host redirects them to the slash form.
export const configSegment = (pathname: string): string => {
    const segment = pathname.slice(1)
    // base64-compressor's alphabet: base64url with '~' as padding.
    if (!/^[A-Za-z0-9_~-]+$/.test(segment)) return ""
    return staticPages.some(p => p.path === `/${segment}/`) ? "" : segment
}

// The page address reported to analytics: the URL path holds the whole grammar, so anything that isn't the home page
// or a static page is reported as /shared. Self-contained (no outer references), because the build inlines its source
// into each page's head so that it runs before gtag reads the address.
export function analyticsPageUrl(href: string, staticPaths: readonly string[]): string {
    const url = new URL(href)
    const path = url.pathname === "/" || staticPaths.indexOf(url.pathname) >= 0 ? url.pathname : "/shared"
    return url.origin + path
}
