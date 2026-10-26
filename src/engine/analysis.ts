import {Expr, getRuleEdges, Grammar, Rule} from "./grammar.ts";

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
