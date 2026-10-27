import {Expr, Grammar, Rule, WeightedExpr} from "./grammar.ts";
import {matchesExclusion, matchNonEmpty} from "./match.ts";
import {chooseValues, deadEndMessage, eligibleRows, emptyScope, ruleAlternatives, Scope, withFilters} from "./features.ts";

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

// State of the word being generated. Repeat factors look up how often an alternative (a pattern row or a `~F`
// alternative, by node identity) was picked earlier in the word.
type Word = {
    rng: Rng
    picks: Map<WeightedExpr, number>
}

// Repeat factors only scale weights, so they draw no extra random numbers and seeds of grammars without them are kept.
const repeatFactor = (w: Word, alt: WeightedExpr): number =>
    alt.repeat === undefined ? 1 : alt.repeat ** (w.picks.get(alt) ?? 0)

const pickAlternative = (g: Grammar, alts: WeightedExpr[], w: Word): WeightedExpr | null => {
    const alt = pick(g, alts.map(a => ({item: a, weight: g.useWeights ? a.weight * repeatFactor(w, a) : a.weight})), w.rng)
    if (alt?.repeat !== undefined) w.picks.set(alt, (w.picks.get(alt) ?? 0) + 1)
    return alt
}

const pick = <T>(g: Grammar, items: { item: T, weight: number }[], rng: Rng): T | null => g.useWeights ?
    weightedPick(items.map(i => [i.item, i.weight]), rng) :
    randomPick(items.map(i => i.item), rng)

// Picks a value for each feature the rule chooses, among those the filters above still allow; draws nothing for rules
// without choices, so seeds of grammars without features give the same words as before features existed.
const pickScope = (g: Grammar, r: Rule, scope: Scope, rng: Rng): Scope =>
    chooseValues(g, r, scope, values => pick(g, values.map(v => ({item: v.name, weight: v.weight})), rng))

const generateExpr = (g: Grammar, e: Expr, w: Word, scope: Scope, matches?: string[]): string => {
    switch (e.tag) {
        case 'Atom':
            return e.value;
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule, w, withFilters(g, scope, e.filters));
        }
        case 'Match': {
            if (matches === undefined)
                throw new Error(`Encountered ambiguous match expression #${e.index}#`);
            // Indices the parser can't check statically (variable-shape patterns) fall back to empty.
            return matches[e.index] ?? "";
        }
        case "Seq":
            return e.items.map(t => generateExpr(g, t, w, scope, matches)).join('')
        case "Choice": {
            const choice = pickAlternative(g, e.items, w)

            if (!choice) {
                return ""
            }

            return generateExpr(g, choice.expr, w, scope, matches)
        }
        case "Boundary":
            throw new Error("Word boundaries can only be matched, not generated");
        case "Quantifier": {
            const n =Math.floor(w.rng() * (1 + e.max - e.min) + e.min)
            let s = ""
            for (let i = 0; i < n; i++) {
                s += generateExpr(g, e.expr, w, scope, matches)
            }
            return s
        }
    }
};

// The rule's own choices, picked on entry, apply to its rows.
// Each retry picks the values again, so an exclusion that rules out one value does not exhaust the retries.
// A rejected attempt is not part of the word, so its picks no longer count for repeat factors.
const generateRule = (g: Grammar, r: Rule, w: Word, scope: Scope = emptyScope): string => {
    for (let i = 0; i < 100; i++) {
        const picks = new Map(w.picks)
        const inner = pickScope(g, r, scope, w.rng)
        const rows = eligibleRows(r, inner)
        // A rule without rows (an empty terminal rule) produces the empty string.
        if (rows.length === 0 && ruleAlternatives(r).length !== 0) throw new Error(deadEndMessage(g, r, inner))
        const row = pickAlternative(g, rows, w)
        let gen = row ? generateExpr(g, row.expr, w, inner) : "";

        gen = applyRuleRewrites(g, r, gen, w, inner);

        if (!matchesExclusion(g, r, gen)) {
            return gen;
        }
        w.picks = picks
    }

    throw new Error("Exclusion rules are too restrictive")
};

export const MAX_REWRITE_PASSES = 32
// A growing rewrite like 'a' → 'aa' doubles the output each pass, so the pass cap alone would not stop it in time.
export const MAX_REWRITE_LENGTH = 10_000

// With repeatRewrites, whole ordered passes run until one changes nothing, so a rewrite can act on text another
// rewrite produced. The caps turn rewrites that keep changing the word (ping-pong, growth) into an error.
const applyRuleRewrites = (g: Grammar, rule: Rule, gen: string, w: Word, scope: Scope): string => {
    if (!g.repeatRewrites || rule.rewrites.length === 0) return rewritePass(g, rule, gen, w, scope)

    let result = gen
    for (let pass = 0; pass < MAX_REWRITE_PASSES; pass++) {
        const next = rewritePass(g, rule, result, w, scope)
        if (next === result) return result
        if (next.length > MAX_REWRITE_LENGTH) {
            throw new Error(`Rewrites of rule '${rule.name}' did not settle: the output grew past ${MAX_REWRITE_LENGTH} characters`)
        }
        result = next
    }
    throw new Error(`Rewrites of rule '${rule.name}' did not settle after ${MAX_REWRITE_PASSES} passes`)
}

const rewritePass = (g: Grammar, rule: Rule, gen: string, w: Word, scope: Scope): string => {
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
            const replacement = generateExpr(g, replace, w, scope, matches);

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
    return generateRule(g, rootRule, {rng, picks: new Map()});
};
