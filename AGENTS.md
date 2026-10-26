# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

Monke is a client-only word generator for conlang creators (React 19 + TypeScript + Vite + Tailwind 4), deployed on Vercel at https://monke.lunah.dev/.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc` type-check, then `vite build`
- `npm run lint` — ESLint, `--max-warnings 0`
- `npm run preview` — serve the production build
- `npm test` — Vitest (jsdom), single run; `npm run test:watch` for watch mode

Tests are colocated as `*.test.ts(x)`: engine tests (parser, wordgen, sharing) plus a few UI smoke tests in `src/pages/Home.test.tsx`. `src/test-setup.ts` polyfills jsdom gaps.

## Architecture

Data flows: UI config → grammar AST → generated words.

- **`Config`** (`src/models/config.ts`) is the single app state: language name, root rule, UI rules (`src/models/ui.ts`), weight/serif flags. `src/pages/Home.tsx` owns it and passes it and an `updateConfig(patch)` callback to the panels. The app is a single page with no router: `Home` reads `location.pathname` once at startup.
- **Rewrites / Exclusions toggles** (`Rw` / `Ex` on a rule) are enable switches: when off, the generator ignores that rule's rewrites or exclusions (the entries are kept in the config). This is intended.
- **Parser** (`src/logic/parser.ts`): `configToGrammar` turns each UI rule's pattern strings into an `Expr` AST (`src/models/grammar.ts`) and validates rule names and references. Terminal-only rules skip parsing; their patterns are literal atoms. Errors are thrown with the rule name appended and surfaced to the user.
- **Pattern syntax**: `'atom'` (with `\` escapes), `Ref` (rule name), `a.b` sequence, `a / b` choice, `*N` weight, `(x)` optional (default weight 0.5, `(x*0.3)`), `[x]` group, `x{n}` / `x{min:max}` quantifier, `#n#` back-reference to the n-th match (used in rewrite replacements).
- **Generator** (`src/logic/wordgen.ts`): recursive random expansion from the root rule (weighted picks only if `useWeights`). Per rule, rewrites are applied to the generated output via a backtracking matcher (`matchExpr`, a generator yielding per-sub-expression match lengths that feed `#n#`), then the result is retried if it matches an exclusion. Empty overall matches are ignored when scanning. Also provides `countCombinations` and `detectCycle` (DFS from the root) for rule reference cycles. `Grammar.ruleMap` is the name lookup for `Ref`s.
- **Sharing** (`src/logic/sharing.ts`, `bytebuffer.ts`): the whole `Config` is serialized to a versioned binary format, compressed to base64, and kept in the URL path (`/<data>`). `Home` decodes the path once on load, then mirrors config changes into the URL with a debounced `history.replaceState`. Changing `Config` or UI rule fields requires updating both `encodeConfig` and `decodeConfig` and bumping/handling the version byte so old links still decode. `vercel.json` rewrites all paths to `index.html` for this.
- **Config files**: `src/logic/configfile.ts` validates `.monke` files imported from the Generator panel.
- **UI**: `src/panels/` holds feature panels (Configuration with rule/rewrite/exclusion sections, Generator, Guide, Faq); `src/components/` holds small layout primitives (`Row`, `Col`, `Linear`, etc.) and `SortableList`/`SortableRow`, the shared dnd-kit sorting wrapper. State updates are immutable (spreads, `updateAt`/`removeAt` in `src/logic/list.ts`). Default example grammar (Toki Pona) is in `src/logic/defaults.ts`.
- **Main dependencies**: React, dnd-kit (sorting), Headless UI (listbox, switch, menu), lucide-react (icons; brand icons are inlined), react-toastify, react-autowidth-input, base64-compressor (share links).
