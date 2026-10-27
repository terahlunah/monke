import {Expr, Grammar, Rule} from "./grammar.ts";
import {eligibleRows, emptyScope, ruleAlternatives, Scope, scopeKey, scopeOptions, withFilters} from "./features.ts";
import {matchesExclusion, matchNonEmpty} from "./match.ts";
import {detectCycle} from "./analysis.ts";
import {MAX_REWRITE_LENGTH, MAX_REWRITE_PASSES} from "./generate.ts";

export const ENUMERATE_LIMIT = 10_000
// Bounds total work (strings built), so grammars whose intermediate rules are huge still stop quickly.
const DEFAULT_BUDGET = 2_000_000

export type Enumeration = {
    words: string[]
    truncated: boolean
}

type Options = {
    limit?: number
    budget?: number
}

type Ctx = {
    g: Grammar
    limit: number
    budget: number
    truncated: boolean
    memo: Map<string, string[]>
}

// Expansion stops once any set is full or the budget is spent. The partial sets still go through rewrites and
// exclusions, so every word listed is a real output; the list is only incomplete.
const grow = (ctx: Ctx, out: Set<string>, s: string) => {
    if (ctx.truncated || out.has(s)) return
    if (--ctx.budget < 0) {
        ctx.truncated = true
        return
    }
    out.add(s)
}

// Only the root's words are capped at the limit: intermediate sets must stay whole, since exclusions further up
// can discard most of them. The budget bounds them instead.
const keep = (ctx: Ctx, out: Set<string>, s: string, cap = Infinity) => {
    if (out.has(s)) return
    if (out.size >= cap) {
        ctx.truncated = true
        return
    }
    out.add(s)
}

const product = (ctx: Ctx, items: Expr[], scope: Scope, matches?: string[]): string[] => {
    let acc: string[] = [""]
    for (const item of items) {
        const options = ofExpr(ctx, item, scope, matches)
        const next = new Set<string>()
        for (const a of acc) {
            for (const b of options) {
                grow(ctx, next, a + b)
                if (ctx.truncated) return [...next]
            }
        }
        acc = [...next]
    }
    return acc
}

// The generator never lands on a zero-weight alternative (unless all are zero, where it takes the first).
const reachable = <T extends { weight: number }>(ctx: Ctx, items: T[]): T[] =>
    !ctx.g.useWeights ? items : items.some(o => o.weight > 0) ? items.filter(o => o.weight > 0) : items.slice(0, 1)

const ofExpr = (ctx: Ctx, e: Expr, scope: Scope, matches?: string[]): string[] => {
    switch (e.tag) {
        case "Atom":
            return [e.value]
        case "Ref": {
            const rule = ctx.g.ruleMap.get(e.rule)
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            return ofRule(ctx, rule, withFilters(ctx.g, scope, e.filters))
        }
        case "Match":
            if (matches === undefined) throw new Error(`Encountered ambiguous match expression #${e.index}#`)
            return [matches[e.index] ?? ""]
        case "Boundary":
            throw new Error("Word boundaries can only be matched, not generated")
        case "Seq":
            return product(ctx, e.items, scope, matches)
        case "Choice": {
            const items = reachable(ctx, e.items)
            if (items.length === 0) return [""]
            const out = new Set<string>()
            for (const o of items) {
                for (const s of ofExpr(ctx, o.expr, scope, matches)) keep(ctx, out, s)
                if (ctx.truncated) break
            }
            return [...out]
        }
        case "Quantifier": {
            const out = new Set<string>()
            for (let n = e.min; n <= e.max && !ctx.truncated; n++) {
                for (const s of product(ctx, Array(n).fill(e.expr), scope, matches)) keep(ctx, out, s)
            }
            return [...out]
        }
    }
}

// Mirrors generate.ts rewritePass, branching wherever a replacement can produce several texts.
const rewriteAt = (ctx: Ctx, match: Expr, replace: Expr, scope: Scope, text: string, from: number, out: Set<string>) => {
    for (let i = from; i < text.length; i++) {
        const lengths = matchNonEmpty(ctx.g, match, text, i)
        if (lengths === null) continue

        let end = i
        const parts = lengths.map(l => text.slice(end, end += l))
        for (const replacement of ofExpr(ctx, replace, scope, parts)) {
            rewriteAt(ctx, match, replace, scope, text.slice(0, i) + replacement + text.slice(end), i + replacement.length, out)
        }
        return
    }
    keep(ctx, out, text)
}

const rewritePass = (ctx: Ctx, rule: Rule, scope: Scope, text: string): string[] => {
    let texts = [text]
    for (const [match, replace] of rule.rewrites) {
        const next = new Set<string>()
        for (const t of texts) rewriteAt(ctx, match, replace, scope, t, 0, next)
        texts = [...next]
    }
    return texts
}

// Mirrors generate.ts applyRuleRewrites: each branch repeats passes until one changes nothing.
const settle = (ctx: Ctx, rule: Rule, scope: Scope, text: string, pass: number, out: Set<string>) => {
    if (pass >= MAX_REWRITE_PASSES) throw new Error(`Rewrites of rule '${rule.name}' did not settle after ${MAX_REWRITE_PASSES} passes`)
    for (const next of rewritePass(ctx, rule, scope, text)) {
        if (next === text) {
            keep(ctx, out, text)
        } else if (next.length > MAX_REWRITE_LENGTH) {
            throw new Error(`Rewrites of rule '${rule.name}' did not settle: the output grew past ${MAX_REWRITE_LENGTH} characters`)
        } else {
            settle(ctx, rule, scope, next, pass + 1, out)
        }
    }
}

// Words of the rule's rows under one set of chosen values. A rule without rows produces the empty string.
const rawWords = (ctx: Ctx, rule: Rule, scope: Scope): string[] => {
    if (ruleAlternatives(rule).length === 0) return [""]
    const out = new Set<string>()
    for (const row of reachable(ctx, eligibleRows(rule, scope))) {
        for (const s of ofExpr(ctx, row.expr, scope)) keep(ctx, out, s)
        if (ctx.truncated) break
    }
    return [...out]
}

// The rule's words are the union over every value its choices can take, each with rewrites run in that scope.
const ofRule = (ctx: Ctx, rule: Rule, scope: Scope, cap = Infinity): string[] => {
    const key = `${rule.name}|${scopeKey(scope)}`
    const cached = ctx.memo.get(key)
    if (cached) return cached

    const options = reachable(ctx, scopeOptions(ctx.g, rule, scope).map(([inner, weight]) => ({inner, weight})))
    const out = new Set<string>()
    let produced = false
    for (const {inner} of options) {
        const raw = rawWords(ctx, rule, inner)
        produced ||= raw.length !== 0
        for (const s of raw) {
            if (out.size >= cap) {
                ctx.truncated = true
                break
            }
            const rewritten = new Set<string>()
            if (ctx.g.repeatRewrites && rule.rewrites.length !== 0) settle(ctx, rule, inner, s, 0, rewritten)
            else for (const r of rewritePass(ctx, rule, inner, s)) keep(ctx, rewritten, r)

            for (const r of rewritten) {
                if (!matchesExclusion(ctx.g, rule, r)) keep(ctx, out, r, cap)
            }
        }
        if (ctx.truncated) break
    }

    // Generation would exhaust its retries here every time.
    if (out.size === 0 && produced && !ctx.truncated) throw new Error("Exclusion rules are too restrictive")

    const words = [...out]
    // A truncated set is incomplete, so later references must not reuse it as if it were the whole rule.
    if (!ctx.truncated) ctx.memo.set(key, words)
    return words
}

const collator = new Intl.Collator()

// Every distinct word the root rule can produce, with rewrites and exclusions applied as generation does, for every
// value the rules' choices can take. Weights only matter where they are zero (never picked). Stops at `limit` words
// or when the work budget runs out.
export const enumerate = (g: Grammar, {limit = ENUMERATE_LIMIT, budget = DEFAULT_BUDGET}: Options = {}): Enumeration => {
    const cycle = detectCycle(g)
    if (cycle) throw new Error(`Cannot list every word of a grammar with a cycle: ${cycle.join(" > ")}`)

    const root = g.ruleMap.get(g.root)
    if (!root) throw new Error(`Root rule ${g.root} not found`)

    const ctx: Ctx = {g, limit, budget, truncated: false, memo: new Map()}
    const words = ofRule(ctx, root, emptyScope, limit).sort(collator.compare)
    return {words, truncated: ctx.truncated}
}
