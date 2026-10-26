import { defineConfig } from "cf/config";

// Assets-only Worker: Vite's client build output (dist/) is the asset source.
// The app state lives in the URL path, so unmatched paths serve index.html.
export default defineConfig({
    worker: {
        name: "monke",
        compatibilityDate: "2026-10-19",
        assets: {
            notFoundHandling: "single-page-application",
        },
    },
});
