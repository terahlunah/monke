# Monke

**A free, grammar-based word generator for conlangs.** Describe the sound patterns of your language with rules and
generate as many words as you need. It runs entirely in your browser: no account, and your grammar lives in the link.

**[Open Monke →](https://monke.lunah.dev/)** · [Reference](https://monke.lunah.dev/reference/) · [FAQ](https://monke.lunah.dev/faq/) · [Coming from Awkwords](https://monke.lunah.dev/awkwords-alternative/)

![Monke: rules on the left, generated words on the right](./preview.png)

## A taste of the syntax

```
C    terminals: p t k s m n
V    terminals: a e i o u
Word pattern:   [C.V]{1:3}.('n'*0.3)     →  ka, tosin, kumane, …
```

Rules combine quoted text, other rules, `.` sequences, `/` choices, `*N` weights, `(x)` optionals and `{min:max}`
repetition. Rewrites (with back-references) model sound changes, and exclusions reject what you don't want.

## Features

- Weighted rules, optionals with their own probability, groups and repetition
- Rewrites with back-references and word boundaries; exclusions that match patterns
- Seeded, repeatable word lists; Generate all lists every possible word
- Share links that hold the whole grammar; browser Back/Forward as undo/redo
- Import Awkwords patterns and `.awkw` files; export and import `.monke` files
- Keyboard and screen reader friendly

## Development

```
npm install
npm run dev      # Vite dev server
npm test         # Vitest
npm run build    # type-check, build, prerender the static pages
```

See [AGENTS.md](./AGENTS.md) for the architecture.
