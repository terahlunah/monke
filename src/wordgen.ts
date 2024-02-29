import findDirectedCycle from "find-cycle/directed"

export type Expr =
    | { tag: 'Atom', value: string }
    | { tag: 'Ref', rule: string }
    | { tag: 'Seq', items: Expr[] }
    | { tag: 'Choice', items: WeightedExpr[] }
    | { tag: 'Quantifier', expr: Expr, min: number, max: number }


export type WeightedExpr = {
    expr: Expr
    weight: number
}

export interface Rule {
    name: string;
    expr: Expr;
    exclusions: Expr[];
    rewrites: [Expr, Expr][];
}

export interface Grammar {
    rules: Rule[];
    root: string;
    useWeights: boolean
}

const matchSeq = (g: Grammar, items: Expr[], s: string): number | null => {
    if (items.length === 0) return 0;

    for (let i = 1; i <= s.length; i++) {
        const sub = s.substring(0, i);
        const exprMatch = matchExpr(g, items[0], sub);
        if (exprMatch !== null) {
            const restMatch = matchSeq(g, items.slice(1), s.substring(exprMatch));
            if (restMatch !== null) return exprMatch + restMatch;
        }
    }

    return null;
};

const matchChoice = (g: Grammar, choices: Expr[], s: string): number | null => {
    for (const e of choices) {
        const match = matchExpr(g, e, s);
        if (match !== null) return match;
    }
    return null;
};

const matchQuantifier = (g: Grammar, expr: Expr, min: number, max: number, s: string): number | null => {
    for (let i = min; i <= max; ++i) {
        const match = matchSeq(g, Array(i).fill(expr), s)
        if (match !== null) return match;
    }
    return null
};

const matchExpr = (g: Grammar, e: Expr, s: string): number | null => {
    switch (e.tag) {
        case 'Atom':
            return s === e.value ? e.value.length : null
        case 'Ref': {
            const rule = g.rules.find(r => r.name === e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            return matchExpr(g, rule.expr, s)
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

const randomPick = <T>(array: T[]): T => {
    const random = Math.floor(Math.random() * array.length);
    return array[random]
};

const weightedPick = <T>(array: [T, number][]): T => {
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

const generateExpr = (g: Grammar, e: Expr): string => {
    switch (e.tag) {
        case 'Atom':
            return e.value;
        case 'Ref': {
            const rule = g.rules.find(r => r.name === e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule);
        }
        case "Seq":
            return e.items.map(t => generateExpr(g, t)).join('')
        case "Choice": {
            const choice = g.useWeights ?
                weightedPick(e.items.map(c => [c.expr, c.weight])) :
                randomPick(e.items.map(c => c.expr))
            return generateExpr(g, choice)
        }
        case "Quantifier": {
            const n = Math.floor(Math.random() * (1 + e.max - e.min) + e.min)
            let s = ""
            for (let i = 0; i < n; i++) {
                s += generateExpr(g, e.expr)
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
            for (let j = i + 1; j <= result.length; j++) {
                const s = result.slice(i, j);
                const exprMatch = matchExpr(g, match, s);
                if (exprMatch !== null) {
                    const head = result.slice(0, i);
                    const tail = result.slice(i + exprMatch);
                    const gen = generateExpr(g, replace);

                    result = head + gen + tail;
                }
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

export const makeAtom = (atom: string): Expr => ({tag: "Atom", value: atom});
export const makeRef = (rule: string): Expr => ({tag: "Ref", rule: rule});
export const makeSeq = (items: Expr[]): Expr => ({tag: "Seq", items: items});

export const makeWeighted = (expr: Expr, weight: number | null): WeightedExpr => ({expr: expr, weight: weight ?? 1.0})
export const makeChoice = (items: Expr[]): Expr => ({tag: "Choice", items: items.map(makeWeighted)});
export const makeWeightedChoice = (items: WeightedExpr[]): Expr => ({tag: "Choice", items: items});
export const makeRepeat = (expr: Expr, count: number): Expr => makeRange(expr, count, count)
export const makeRange = (expr: Expr, min: number, max: number): Expr => ({
    tag: "Quantifier",
    expr: expr,
    min: min,
    max: max
});
export const makeRule = (name: string, expr: Expr, exclusions: Expr[], rewrites: [Expr, Expr][]): Rule => ({
    name: name,
    expr: expr,
    exclusions: exclusions,
    rewrites: rewrites
})
export const makeGrammar = (root: string, rules: Rule[], useWeights: boolean = true): Grammar => ({
    rules: rules,
    root: root,
    useWeights: useWeights,
})

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
