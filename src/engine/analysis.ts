import {Expr, getRuleEdges, Grammar, Rule} from "./grammar.ts";
import {eligibleRows, emptyScope, Scope, scopeKey, scopeOptions, withFilters} from "./features.ts";

// Number of ways to derive a word: each choice of feature values times the derivations left under it. Like the
// count without features, it counts derivations, not distinct words, so it is an upper bound on the word count.
export const countCombinations = (g: Grammar): number => {
    const rootRule = g.ruleMap.get(g.root);
    if (!rootRule) throw new Error(`Root rule ${g.root} not found`);
    return countCombinationsRule(g, rootRule, emptyScope, new Map())
}

type Memo = Map<string, number>

const countCombinationsRule = (g: Grammar, r: Rule, scope: Scope, memo: Memo): number => {
    const key = `${r.name}|${scopeKey(scope)}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    let count = 0
    for (const [inner] of scopeOptions(g, r, scope)) {
        for (const row of eligibleRows(r, inner)) count += countCombinationsExpr(g, row.expr, inner, memo)
    }
    memo.set(key, count)
    return count
}

const countCombinationsExpr = (g: Grammar, e: Expr, scope: Scope, memo: Memo): number => {
    switch (e.tag) {
        case "Atom":
            return 1;
        case "Ref": {
            const rule = g.ruleMap.get(e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return countCombinationsRule(g, rule, withFilters(g, scope, e.filters), memo);
        }
        case "Match":
            throw new Error('Match syntax used outside replacement expression');
        case "Boundary":
            throw new Error('Word boundary used outside a rewrite match or exclusion');
        case "Seq":
            return e.items.reduce((acc, it) => acc * countCombinationsExpr(g, it, scope, memo), 1);
        case "Choice":
            return e.items.reduce((acc, it) => acc + countCombinationsExpr(g, it.expr, scope, memo), 0);
        case "Quantifier": {
            let count = 0
            const exprCount = countCombinationsExpr(g, e.expr, scope, memo)

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
