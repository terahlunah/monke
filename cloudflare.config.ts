import { bindings, defineConfig } from "cf/config";

// Static assets are served first (free); the Worker runs only for paths without a matching file. The app state lives
// in the URL path, so the Worker serves index.html for share links and a real 404 for everything else.
// notFoundHandling stays "none": with any other value, browser navigations that miss would get the fallback asset
// without invoking the Worker (assets_navigation_prefers_asset_serving), and share links are navigations.
export default defineConfig({
    worker: {
        name: "monke",
        compatibilityDate: "2026-10-19",
        domains: ["monke.lunah.dev"],
        entrypoint: "./src/worker/index.ts",
        env: {
            ASSETS: bindings.assets(),
        },
        assets: {
            notFoundHandling: "none",
        },
    },
});
