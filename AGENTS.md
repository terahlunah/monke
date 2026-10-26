# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

Monke is a client-only word generator for conlang creators (React 19 + TypeScript + Vite + Tailwind 4), served at https://monke.lunah.dev/.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc` type-check, then `cf build` (Vite build with the Cloudflare plugin; output in `.cloudflare/output/v0/`)
- `npm run lint` — ESLint, `--max-warnings 0`
- `npm run preview` — serve the production build
- `npm run preview:cf` — `cf dev`, local Workers runtime
- `npm test` — Vitest (jsdom), single run; `npm run test:watch` for watch mode

Tests are colocated as `*.test.ts(x)`: engine tests (pattern, buildGrammar, generate, configReducer, sharing) plus UI tests in `src/app/` (`Home`, `reorder`, `semantics`, `a11y`). `src/test-setup.ts` polyfills jsdom gaps.

## Architecture

Data flows: UI config → grammar AST → generated words.

- **Layout**: `src/engine/` is pure TS (no React) and holds everything below except UI. `src/app/` is the shell (`App`, `Home`, `Navbar`, `useUrlConfig`). `src/features/{config,generator,docs}/` hold the feature UI. `src/components/` holds small layout primitives (`Row`, `Col`, `Linear`, etc.) and `SortableList`/`SortableRow`, the shared dnd-kit sorting wrapper. `@/` aliases `src/` (tsconfig `paths` + Vite `resolve.alias`); engine files use relative imports.
- **`Config`** (`src/engine/config.ts`, with the UI rule types) is the single app state: language name, root rule, rules, weight/serif flags. `useUrlConfig` owns it via `useReducer(configReducer)`; panels receive `config` and `dispatch`. All mutations are typed `ConfigAction`s handled in `src/engine/configReducer.ts` (rules addressed by id; new items get ids there). Add new mutations as an action plus a reducer test. The app is a single page with no router: the URL path is read once at startup.
- **Rewrites / Exclusions toggles** (`Rw` / `Ex` on a rule) are enable switches: when off, the generator ignores that rule's rewrites or exclusions (the entries are kept in the config). This is intended.
- **Pattern parser** (`pattern.ts`): `Parser` turns one pattern string into an `Expr` AST (`grammar.ts`). **Grammar builder** (`buildGrammar.ts`): `configToGrammar` parses each rule, validates rule names and references, and applies the Rw/Ex enable flags. Terminal-only rules skip parsing; their patterns are literal atoms. Errors are thrown with the rule name appended and surfaced to the user.
- **Pattern syntax**: `'atom'` (with `\` escapes), `Ref` (rule name), `a.b` sequence, `a / b` choice, `*N` weight, `(x)` optional (default weight 0.5, `(x*0.3)`), `[x]` group, `x{n}` / `x{min:max}` quantifier, `#n#` back-reference to the n-th match (used in rewrite replacements).
- **Generator**: `generate.ts` does recursive random expansion from the root rule (weighted picks only if `useWeights`) and takes an injectable `rng` (default `Math.random`); tests use the seeded `mulberry32` from `test-helpers.ts`. Per rule, rewrites are applied to the output, then it is retried if it matches an exclusion. `match.ts` is the backtracking matcher (a generator yielding per-sub-expression match lengths that feed `#n#`); empty overall matches are ignored when scanning. `analysis.ts` has `countCombinations` and `detectCycle` (DFS from the root). `Grammar.ruleMap` is the name lookup for `Ref`s.
- **Sharing** (`sharing.ts`, `bytebuffer.ts`): the whole `Config` is serialized to a versioned binary format, compressed to base64, and kept in the URL path (`/<data>`). `useUrlConfig` decodes the path on load and on `popstate`, and mirrors config changes into the URL with a debounced `history.pushState`, so browser Back/Forward act as undo/redo. Decoding dispatches on the version byte through a per-version table; encoding always writes the latest. Changing `Config` or rule fields requires a new version: add a decoder (never edit shipped ones), bump `LATEST_VERSION`, update `encodeConfig`, and add a frozen-link test. `notFoundHandling: "single-page-application"` in `cloudflare.config.ts` serves `index.html` for all paths.
- **Config files**: `configfile.ts` validates `.monke` files imported from the Generator panel. The Toki Pona example grammar and `emptyConfig`/`defaultConfig` are in `defaults.ts`. State updates are immutable (`patchById`/`removeById`/`moveItem` in `list.ts`).
- **Main dependencies**: React, dnd-kit (sorting), Headless UI (listbox, switch), lucide-react (icons; brand icons are inlined), react-toastify, react-autowidth-input, base64-compressor (share links).

## Accessibility

Screen reader users (NVDA, TalkBack) are core users. Every change must keep these true:

- **Names**: every control has an accessible name that locates it (`Delete pattern 2 of rule Vowel`, not `Delete`). Names stay constant when state changes; state goes in `aria-checked`, `aria-pressed` or `aria-expanded`. Icon-only buttons need `aria-label`; visible text must be part of the name.
- **Keyboard**: everything is operable with the keyboard and has a visible focus ring (global `:focus-visible` in `main.css`).
- **No drag-only features**: anything draggable also has buttons. Sortable items get `MoveButtons` (left/right for horizontal chips, up/down for rules) and the list a `describe` for dnd-kit announcements. Rule buttons are always shown; chip buttons are collapsed to zero width until the chip contains keyboard focus (`:focus-visible`; never `display:none`, so they stay in the tab order). Never reveal on hover: it shifts targets under the pointer; the viewer setting "Always show reorder buttons" (`reorderPref.ts`, localStorage, not in `Config`) keeps them visible.
- **Announcements**: results and state changes that appear without focus moving go through a live region (`role="status"` for results, `role="alert"` for errors). Announce a summary, never a long list. Grammar errors also set `aria-invalid` and `aria-describedby` on the input at fault (`useInvalidProps`).
- **Structure**: one `h1`, no skipped heading levels, landmarks (`header`, `nav`, `main`). Examples in the Guide are static (`role="img"` with a text alternative), not fake controls.
- **No hacks for character reading**: do not insert spaces or separators between letters. Screen readers have character modes.

Verify: `npm run lint` (jsx-a11y, no disables without a stated reason) and `npm test`. `src/app/a11y.test.tsx` runs axe on each main view and state; add a case for any new view or state. jsdom can't compute colour contrast, so check it in a real browser by running axe-core there, and drive the page with a screen reader or Playwright `ariaSnapshot()` for names and order. Known gap: some palette colours with white text are below WCAG AA (4.5:1).

## Deployment

- Hosted as a Cloudflare Workers assets-only Worker (`monke`), built and deployed by Workers Builds (Git integration). Custom domain is set via `domains` in `cloudflare.config.ts`.
- Use the `cf` CLI (devDependency), not wrangler. Config is `cloudflare.config.ts`; `cf` ignores `package.json` scripts, so `npm run build` chains `tsc && cf build`.
- Workers Builds: build command `npm run build` (or `npx cf build`), deploy command `npx cf deploy`. Validate locally with `npx cf deploy --dry-run`.
- `public/_headers` sets cache headers (immutable for `/assets/*`, revalidate for HTML).
- `.cloudflare/` is generated output and gitignored.
