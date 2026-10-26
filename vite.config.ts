import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    appType: "spa",
    base: "/",
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test-setup.ts"],
        css: false,
    },
})
