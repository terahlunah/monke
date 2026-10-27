import {configSegment, notFoundPage} from "../site/pages.ts";

// Runs only when no static asset matches the request (files and prerendered pages are served without it). The only
// app routes left are share links, a single base64url segment; everything else gets the 404 page with a 404 status,
// so missing files such as /foo.json or /.well-known/* never come back as the HTML shell with 200.

export interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> }
}

export const handleMiss = async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url)
    if (configSegment(url.pathname)) return env.ASSETS.fetch(new Request(new URL("/", url), request))
    const page = await env.ASSETS.fetch(new Request(new URL(notFoundPage.path, url), request))
    return new Response(page.body, {status: 404, headers: page.headers})
}

export default {fetch: handleMiss}
