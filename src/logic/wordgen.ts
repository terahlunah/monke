import findDirectedCycle from "find-cycle/directed"
import {Expr, Grammar, Rule} from "../models/grammar.ts";

const matchSeq = (g: Grammar, items: Expr[], s: string): number[] | null => {
    if (items.length === 0) return [0];

    for (let i = 1; i <= s.length; i++) {
        const sub = s.substring(0, i);
        const exprMatch = matchExpr(g, items[0], sub);
        if (exprMatch !== null) {
            const restMatch = matchSeq(g, items.slice(1), s.substring(exprMatch[0]));
            if (restMatch !== null) return [...exprMatch, ...restMatch];
        }
    }

    return null;
};

const matchChoice = (g: Grammar, choices: Expr[], s: string): number[] | null => {
    for (const e of choices) {
        const match = matchExpr(g, e, s);
        if (match !== null) return match;
    }
    return null;
};

const matchQuantifier = (g: Grammar, expr: Expr, min: number, max: number, s: string): number[] | null => {
    for (let i = min; i <= max; ++i) {
        const match = matchSeq(g, Array(i).fill(expr), s)
        if (match !== null) return match;
    }
    return null
};

const matchExpr = (g: Grammar, e: Expr, s: string): number[] | null => {
    switch (e.tag) {
        case 'Atom':
            return s.startsWith(e.value) ? [e.value.length] : null
        case 'Ref': {
            const rule = g.rules.find(r => r.name === e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            return matchExpr(g, rule.expr, s)
        }
        case 'Match': {
            throw new Error(`Encountered ambiguous match expression #${e.index}#`)
        }
        case "Seq":
            return matchSeq(g, e.items, s)
        case "Choice":
            return matchChoice(g, e.items.map(c => c.expr), s)
        case "Quantifier":
            return matchQuantifier(g, e.expr, e.min, e.max, s)

    }
};


const checkRuleExclusions = (g: Grammar, r: Rule, gen: string) => {
    for (const e of r.exclusions) {
        for (let i = 0; i < gen.length; i++) {
            for (let j = i + 1; j <= gen.length; j++) {
                const s = gen.slice(i, j);

                if (matchExpr(g, e, s) !== null) {
                    return true;
                }
            }
        }
    }

    return false;
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
            const rule = g.rules.find(r => r.name === e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule);
        }
        case 'Match': {
            if (matches === undefined)
                throw new Error(`Encountered ambiguous match expression #${e.index}#`);
            return matches[e.index];
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
    let result = gen.slice()

    for (const [match, replace] of rule.rewrites) {

        for (let i = 0; i < result.length; i++) {
            const s = result.slice(i);
            const exprMatch = matchExpr(g, match, s);
            if (exprMatch !== null) {
                let matchEnd = 0;
                const matches = exprMatch.map(l => {
                    const newMatchEnd = matchEnd + l;
                    const match = s.slice(matchEnd, newMatchEnd);
                    matchEnd = newMatchEnd;
                    return match;
                });
                console.log(matches);
                const head = result.slice(0, i);
                const tail = result.slice(i + matchEnd);
                const gen = generateExpr(g, replace, matches);

                result = head + gen + tail;
            }
        }
    }

    return result;
};

export const generate = (g: Grammar): string => {
    const rootRule = g.rules.find(r => r.name === g.root);
    if (!rootRule) throw new Error(`Root rule ${g.root} not found`);
    return generateRule(g, rootRule);
};

export const countCombinations = (g: Grammar): number => {
    return countCombinationsRule(g, g.rules.find(r => r.name === g.root)!)
}

const countCombinationsRule = (g: Grammar, r: Rule): number => {
    return countCombinationsExpr(g, r.expr)
}

const countCombinationsExpr = (g: Grammar, e: Expr): number => {
    switch (e.tag) {
        case "Atom":
            return 1;
        case "Ref":
            return countCombinationsRule(g, g.rules.find(r => r.name === e.rule)!);
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

// detect cycles

const getExprEdges = (e: Expr): string[] => {
    switch (e.tag) {
        case "Atom":
            return [];
        case "Ref":
            return [e.rule];
        case "Match":
            return [];
        case "Seq":
            return e.items.flatMap(getExprEdges);
        case "Choice":
            return e.items.map(o => o.expr).flatMap(getExprEdges);
        case "Quantifier":
            return getExprEdges(e.expr);

    }
}

export const getRuleEdges = (r: Rule): string[] => {
    return getExprEdges(r.expr)
}

export const detectCycle = (g: Grammar): string[] | null | undefined => {

    const edges: { [key: string]: string[] } = g.rules.reduce((acc, r) => ({...acc, [r.name]: getRuleEdges(r)}), {})
    const getConnectedNodes = (node: string): string[] => edges[node]

    return findDirectedCycle([g.root], getConnectedNodes)
}
