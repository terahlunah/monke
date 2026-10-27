import {describe, expect, it} from "vitest";
import {defaultConfig} from "@/engine/defaults.ts";
import {encodeConfig} from "@/engine/sharing.ts";
import {notFoundPage} from "@/site/pages.ts";
import {Env, handleMiss} from "./index.ts";

// Stands in for the assets binding: returns the requested path as the body.
const env: Env = {
    ASSETS: {fetch: async (request: Request) => new Response(new URL(request.url).pathname, {headers: {"Content-Type": "text/html"}})},
}

const serve = (path: string) => handleMiss(new Request(`https://monke.lunah.dev${path}`), env)

describe("handleMiss", () => {
    it("serves the app shell for a share link", async () => {
        const res = await serve(`/${await encodeConfig(defaultConfig)}`)
        expect(res.status).toBe(200)
        expect(await res.text()).toBe("/")
    })

    it.each(["/foo.json", "/x.png", "/.well-known/nope", "/a/b", "/reference/extra", "/faq/x.html"])("returns the 404 page for %s", async path => {
        const res = await serve(path)
        expect(res.status).toBe(404)
        expect(await res.text()).toBe(notFoundPage.path)
        expect(res.headers.get("Content-Type")).toBe("text/html")
    })
})
