import {Expr, Filter, Grammar, Rule} from "./grammar.ts";
import {matchesExclusion, matchNonEmpty} from "./match.ts";
import {conflictsWith, deadEndMessage, eligibleNested, eligibleRows, emptyScope, outOfScopeMessage, ruleAlternatives, Scope} from "./features.ts";

export type Rng = () => number

const randomPick = <T>(array: T[], rng: Rng): T | null => {
    if (array.length === 0) {
        return null
    }

    const random = Math.floor(rng() * array.length);
    return array[random]
};

const weightedPick = <T>(array: [T, number][], rng: Rng): T | null => {
    if (array.length === 0) {
        return null
    }

    const totalWeight = array.reduce((acc, [, weight]) => acc + weight, 0);

    let random = rng() * totalWeight;

    for (const [item, weight] of array) {
        random -= weight;
        if (random <= 0) {
            return item;
        }
    }

    // In case of rounding errors, return the last item
    return array[array.length - 1][0];
};

const pick = <T>(g: Grammar, items: { item: T, weight: number }[], rng: Rng): T | null => g.useWeights ?
    weightedPick(items.map(i => [i.item, i.weight]), rng) :
    randomPick(items.map(i => i.item), rng)

// Picks a value for each feature the rule chooses; draws nothing for rules without choices, so seeds of grammars
// without features give the same words as before features existed.
const pickScope = (g: Grammar, r: Rule, scope: Scope, rng: Rng): Scope => {
    if (!r.chooses?.length) return scope
    const inner = new Map(scope)
    for (const name of r.chooses) {
        const feature = g.features.find(f => f.name === name)
        const value = feature && pick(g, feature.values.map(v => ({item: v.name, weight: v.weight})), rng)
        if (value !== null && value !== undefined) inner.set(name, value)
    }
    return inner
}

const generateExpr = (g: Grammar, e: Expr, rng: Rng, scope: Scope, matches?: string[]): string => {
    switch (e.tag) {
        case 'Atom':
            return e.value;
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule, rng, scope, e.filters);
        }
        case 'Match': {
            if (matches === undefined)
                throw new Error(`Encountered ambiguous match expression #${e.index}#`);
            // Indices the parser can't check statically (variable-shape patterns) fall back to empty.
            return matches[e.index] ?? "";
        }
        case "Seq":
            return e.items.map(t => generateExpr(g, t, rng, scope, matches)).join('')
        case "Choice": {
            const items = eligibleNested(g, e.items, scope)
            if (items.length === 0 && e.items.length !== 0) {
                throw new Error(`No alternative of a choice can be used when ${[...scope].map(([f, v]) => `${f} is ${v}`).join(" and ")}`)
            }
            const choice = pick(g, items.map(c => ({item: c.expr, weight: c.weight})), rng)

            if (!choice) {
                return ""
            }

            return generateExpr(g, choice, rng, scope, matches)
        }
        case "Boundary":
            throw new Error("Word boundaries can only be matched, not generated");
        case "Quantifier": {
            const n =Math.floor(rng() * (1 + e.max - e.min) + e.min)
            let s = ""
            for (let i = 0; i < n; i++) {
                s += generateExpr(g, e.expr, rng, scope, matches)
            }
            return s
        }
    }
};

// The rule's values are checked against the scope it is entered in; its own choices then apply to its rows.
// Each retry picks the values again, so an exclusion that rules out one value does not exhaust the retries.
const generateRule = (g: Grammar, r: Rule, rng: Rng, scope: Scope = emptyScope, filters: Filter[] = []): string => {
    if (r.tags && conflictsWith(r.tags, scope)) throw new Error(outOfScopeMessage(r, scope))

    for (let i = 0; i < 100; i++) {
        const inner = pickScope(g, r, scope, rng)
        const rows = eligibleRows(g, r, inner, filters)
        // A rule without rows (an empty terminal rule) produces the empty string.
        if (rows.length === 0 && ruleAlternatives(r).length !== 0) throw new Error(deadEndMessage(r, inner, filters))
        const row = pick(g, rows.map(o => ({item: o.expr, weight: o.weight})), rng)
        let gen = row ? generateExpr(g, row, rng, inner) : "";

        gen = applyRuleRewrites(g, r, gen, rng, inner);

        if (!matchesExclusion(g, r, gen)) {
            return gen;
        }
    }

    throw new Error("Exclusion rules are too restrictive")
};

export const MAX_REWRITE_PASSES = 32
// A growing rewrite like 'a' → 'aa' doubles the output each pass, so the pass cap alone would not stop it in time.
export const MAX_REWRITE_LENGTH = 10_000

// With repeatRewrites, whole ordered passes run until one changes nothing, so a rewrite can act on text another
// rewrite produced. The caps turn rewrites that keep changing the word (ping-pong, growth) into an error.
const applyRuleRewrites = (g: Grammar, rule: Rule, gen: string, rng: Rng, scope: Scope): string => {
    if (!g.repeatRewrites || rule.rewrites.length === 0) return rewritePass(g, rule, gen, rng, scope)

    let result = gen
    for (let pass = 0; pass < MAX_REWRITE_PASSES; pass++) {
        const next = rewritePass(g, rule, result, rng, scope)
        if (next === result) return result
        if (next.length > MAX_REWRITE_LENGTH) {
            throw new Error(`Rewrites of rule '${rule.name}' did not settle: the output grew past ${MAX_REWRITE_LENGTH} characters`)
        }
        result = next
    }
    throw new Error(`Rewrites of rule '${rule.name}' did not settle after ${MAX_REWRITE_PASSES} passes`)
}

const rewritePass = (g: Grammar, rule: Rule, gen: string, rng: Rng, scope: Scope): string => {
    let result = gen

    for (const [match, replace] of rule.rewrites) {
        let i = 0
        while (i < result.length) {
            const s = result.slice(i);
            const exprMatch = matchNonEmpty(g, match, result, i);
            if (exprMatch === null) {
                i++
                continue
            }

            let matchEnd = 0;
            const matches = exprMatch.map(l => {
                const newMatchEnd = matchEnd + l;
                const part = s.slice(matchEnd, newMatchEnd);
                matchEnd = newMatchEnd;
                return part;
            });
            const replacement = generateExpr(g, replace, rng, scope, matches);

            result = result.slice(0, i) + replacement + result.slice(i + matchEnd);
            // Resume after the inserted text so replacements are never rewritten again.
            i += replacement.length
        }
    }

    return result;
};

export const generate = (g: Grammar, rng: Rng = Math.random): string => {
    const rootRule = g.ruleMap.get(g.root);
    if (!rootRule) throw new Error(`Root rule ${g.root} not found`);
    return generateRule(g, rootRule, rng);
};
