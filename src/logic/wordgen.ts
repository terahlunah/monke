import {Expr, getRuleEdges, Grammar, Rule} from "../models/grammar.ts";

// Matchers are generators so a sequence can backtrack into the alternatives of an
// earlier item. Each yielded array holds one length per sub-part of the expression.
// Sub-matches may be empty (optionals); callers decide whether an empty overall match counts.
function* matchSeq(g: Grammar, items: Expr[], s: string): Generator<number[]> {
    if (items.length === 0) {
        yield []
        return
    }

    for (const first of matchExpr(g, items[0], s)) {
        // A nested match reports one length per sub-part; the item as a whole
        // consumes their sum and counts as a single back-reference.
        const consumed = first.reduce((a, b) => a + b, 0)
        for (const rest of matchSeq(g, items.slice(1), s.substring(consumed))) {
            yield [consumed, ...rest]
        }
    }
}

function* matchQuantifier(g: Grammar, expr: Expr, min: number, max: number, s: string): Generator<number[]> {
    for (let i = min; i <= max; ++i) {
        yield* matchSeq(g, Array(i).fill(expr), s)
    }
}

function* matchExpr(g: Grammar, e: Expr, s: string): Generator<number[]> {
    switch (e.tag) {
        case 'Atom':
            if (s.startsWith(e.value)) yield [e.value.length]
            return
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule)
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            yield* matchExpr(g, rule.expr, s)
            return
        }
        case 'Match':
            throw new Error(`Encountered ambiguous match expression #${e.index}#`)
        case "Seq":
            yield* matchSeq(g, e.items, s)
            return
        case "Choice":
            for (const c of e.items) yield* matchExpr(g, c.expr, s)
            return
        case "Quantifier":
            yield* matchQuantifier(g, e.expr, e.min, e.max, s)
    }
}

// First match anchored at the start of `s` that consumes at least one character.
const matchNonEmpty = (g: Grammar, e: Expr, s: string): number[] | null => {
    for (const m of matchExpr(g, e, s)) {
        if (m.some(l => l > 0)) return m
    }
    return null
}

const checkRuleExclusions = (g: Grammar, r: Rule, gen: string) => {
    for (const e of r.exclusions) {
        for (let i = 0; i < gen.length; i++) {
            if (matchNonEmpty(g, e, gen.slice(i)) !== null) {
                return true
            }
        }
    }

    return false
};

const randomPick = <T>(array: T[]): T | null => {
    if (array.length === 0) {
        return null
    }

    const random = Math.floor(Math.random() * array.length);
    return array[random]
};

const weightedPick = <T>(array: [T, number][]): T | null => {
    if (array.length === 0) {
        return null
    }

    const totalWeight = array.reduce((acc, [, weight]) => acc + weight, 0);

    let random = Math.random() * totalWeight;

    for (const [item, weight] of array) {
        random -= weight;
        if (random <= 0) {
            return item;
        }
    }

    // In case of rounding errors, return the last item
    return array[array.length - 1][0];
};

const generateExpr = (g: Grammar, e: Expr, matches?: string[]): string => {
    switch (e.tag) {
        case 'Atom':
            return e.value;
        case 'Ref': {
            const rule = g.ruleMap.get(e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule);
        }
        case 'Match': {
            if (matches === undefined)
                throw new Error(`Encountered ambiguous match expression #${e.index}#`);
            // Indices the parser can't check statically (variable-shape patterns) fall back to empty.
            return matches[e.index] ?? "";
        }
        case "Seq":
            return e.items.map(t => generateExpr(g, t, matches)).join('')
        case "Choice": {
            const choice = g.useWeights ?
                weightedPick(e.items.map(c => [c.expr, c.weight])) :
                randomPick(e.items.map(c => c.expr))

            if (!choice) {
                return ""
            }

            return generateExpr(g, choice, matches)
        }
        case "Quantifier": {
            const n = Math.floor(Math.random() * (1 + e.max - e.min) + e.min)
            let s = ""
            for (let i = 0; i < n; i++) {
                s += generateExpr(g, e.expr, matches)
            }
            return s
        }
    }
};

const generateRule = (g: Grammar, r: Rule): string => {

    for (let i = 0; i < 100; i++) {
        let gen = generateExpr(g, r.expr);

        gen = applyRuleRewrites(g, r, gen);

        if (!checkRuleExclusions(g, r, gen)) {
            return gen;
        }
    }

    throw new Error("Exclusion rules are too restrictive")
};

const applyRuleRewrites = (g: Grammar, rule: Rule, gen: string): string => {
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
            const replacement = generateExpr(g, replace, matches);

            result = result.slice(0, i) + replacement + result.slice(i + matchEnd);
            // Resume after the inserted text so replacements are never rewritten again.
            i += replacement.length
        }
    }

    return result;
};

export const generate = (g: Grammar): string => {
    const rootRule = g.ruleMap.get(g.root);
    if (!rootRule) throw new Error(`Root rule ${g.root} not found`);
    return generateRule(g, rootRule);
};

export const countCombinations = (g: Grammar): number => {
    const rootRule = g.ruleMap.get(g.root);
    if (!rootRule) throw new Error(`Root rule ${g.root} not found`);
    return countCombinationsRule(g, rootRule)
}

const countCombinationsRule = (g: Grammar, r: Rule): number => {
    return countCombinationsExpr(g, r.expr)
}

const countCombinationsExpr = (g: Grammar, e: Expr): number => {
    switch (e.tag) {
        case "Atom":
            return 1;
        case "Ref": {
            const rule = g.ruleMap.get(e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return countCombinationsRule(g, rule);
        }
        case "Match":
            throw new Error('Match syntax used outside replacement expression');
        case "Seq":
            return e.items.reduce((acc, it) => acc * countCombinationsExpr(g, it), 1);
        case "Choice":
            return e.items.reduce((acc, it) => acc + countCombinationsExpr(g, it.expr), 0);
        case "Quantifier": {
            let count = 0
            const exprCount = countCombinationsExpr(g, e.expr)

            for (let i = e.min; i <= e.max; i++) {
                count += Math.pow(exprCount, i)
            }

            return count;
        }
    }
}

// Depth-first search from the root; returns the first cycle found as a path that
// starts and ends on the same rule, or null.
export const detectCycle = (g: Grammar): string[] | null => {
    const done = new Set<string>()
    const path: string[] = []

    const visit = (name: string): string[] | null => {
        const at = path.indexOf(name)
        if (at !== -1) return [...path.slice(at), name]
        if (done.has(name)) return null

        const rule = g.ruleMap.get(name)
        if (!rule) return null

        path.push(name)
        for (const next of getRuleEdges(rule)) {
            const cycle = visit(next)
            if (cycle) return cycle
        }
        path.pop()
        done.add(name)
        return null
    }

    return visit(g.root)
}
