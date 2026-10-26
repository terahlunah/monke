# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

Monke is a client-only word generator for conlang creators (React 18 + TypeScript + Vite + Tailwind), deployed on Vercel at https://monke.lunah.dev/.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc` type-check, then `vite build`
- `npm run lint` — ESLint, `--max-warnings 0`
- `npm run preview` — serve the production build
- `npm test` — Vitest (jsdom), single run; `npm run test:watch` for watch mode

Tests are colocated as `*.test.ts(x)`: engine tests (parser, wordgen, sharing) plus a few UI smoke tests in `src/pages/Home.test.tsx`. `src/test-setup.ts` polyfills jsdom gaps.

## Architecture

Data flows: UI config → grammar AST → generated words.

- **`Config`** (`src/pages/Home.tsx`) is the single app state: language name, root rule, UI rules (`src/models/ui.ts`), weight/serif flags. `Home` owns it and passes it to the panels.
- **Parser** (`src/logic/parser.ts`): `configToGrammar` turns each UI rule's pattern strings into an `Expr` AST (`src/models/grammar.ts`) and validates rule names and references. Terminal-only rules skip parsing; their patterns are literal atoms. Errors are thrown with the rule name appended and surfaced to the user.
- **Pattern syntax**: `'atom'` (with `\` escapes), `Ref` (rule name), `a.b` sequence, `a / b` choice, `*N` weight, `(x)` optional (default weight 0.5, `(x*0.3)`), `[x]` group, `x{n}` / `x{min:max}` quantifier, `#n#` back-reference to the n-th match (used in rewrite replacements).
- **Generator** (`src/logic/wordgen.ts`): recursive random expansion from the root rule (weighted picks only if `useWeights`). Per rule, generated output is retried against exclusions, then rewrites are applied via a backtracking matcher (`matchExpr`) returning per-sub-expression match lengths, which feed `#n#`. Also provides `countCombinations` and `detectCycle` for rule reference cycles.
- **Sharing** (`src/logic/sharing.ts`, `bytebuffer.ts`): the whole `Config` is serialized to a versioned binary format, compressed to base64, and kept in the URL path (`/:urlConfig`); `Home` syncs URL ↔ config. Changing `Config` or UI rule fields requires updating both `encodeConfig` and `decodeConfig` and bumping/handling the version byte so old links still decode. `vercel.json` rewrites all paths to `index.html` for this.
- **UI**: `src/panels/` holds feature panels (Configuration with rule/rewrite/exclusion sections using dnd-kit sorting, Generator, Guide, Faq); `src/components/` holds small layout primitives (`Row`, `Col`, `Linear`, etc.). Default example grammar (Toki Pona) is in `src/logic/defaults.ts`.
