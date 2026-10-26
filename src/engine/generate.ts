import {Expr, Grammar, Rule} from "./grammar.ts";
import {matchesExclusion, matchNonEmpty} from "./match.ts";

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

const generateExpr = (g: Grammar, e: Expr, rng: Rng, matches?: string[]): string => {
    switch (e.tag) {
        case 'Atom':
            return e.value;
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule, rng);
        }
        case 'Match': {
            if (matches === undefined)
                throw new Error(`Encountered ambiguous match expression #${e.index}#`);
            // Indices the parser can't check statically (variable-shape patterns) fall back to empty.
            return matches[e.index] ?? "";
        }
        case "Seq":
            return e.items.map(t => generateExpr(g, t, rng, matches)).join('')
        case "Choice": {
            const choice = g.useWeights ?
                weightedPick(e.items.map(c => [c.expr, c.weight]), rng) :
                randomPick(e.items.map(c => c.expr), rng)

            if (!choice) {
                return ""
            }

            return generateExpr(g, choice, rng, matches)
        }
        case "Quantifier": {
            const n = Math.floor(rng() * (1 + e.max - e.min) + e.min)
            let s = ""
            for (let i = 0; i < n; i++) {
                s += generateExpr(g, e.expr, rng, matches)
            }
            return s
        }
    }
};

const generateRule = (g: Grammar, r: Rule, rng: Rng): string => {

    for (let i = 0; i < 100; i++) {
        let gen = generateExpr(g, r.expr, rng);

        gen = applyRuleRewrites(g, r, gen, rng);

        if (!matchesExclusion(g, r, gen)) {
            return gen;
        }
    }

    throw new Error("Exclusion rules are too restrictive")
};

const applyRuleRewrites = (g: Grammar, rule: Rule, gen: string, rng: Rng): string => {
    let result = gen

    for (const [match, replace] of rule.rewrites) {
        let i = 0
        while (i < result.length) {
            const s = result.slice(i);
            const exprMatch = matchNonEmpty(g, match, s);
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
            const replacement = generateExpr(g, replace, rng, matches);

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
