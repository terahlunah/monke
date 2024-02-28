export type Expr =
    | { tag: 'Atom', value: string }
    | { tag: 'Ref', rule: string }
    | { tag: 'Seq', items: Expr[] }
    | { tag: 'Choice', items: WeightedExpr[] }
    | { tag: 'Quantifier', term: Expr, min: number, max: number }


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

const matchExpr = (g: Grammar, e: Expr, s: string): number | null => {
    switch (e.tag) {
        case 'Atom':
            return s === e.value ? e.value.length : null
        case 'Ref':
            const rule = g.rules.find(r => r.name === e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`)
            return matchExpr(g, rule.expr, s)
        case "Seq":
            return matchSeq(g, e.items, s)
        case "Choice":
            return matchChoice(g, e.items.map(c => c.expr), s)
        case "Quantifier":
            // TODO FIX, we need to try every combinaisons
            return null
        // const n = Math.random() * (t.max - t.min) + t.min
        // let sub = s
        // let count = 0
        //
        // for (let i = 0; i < n; i++) {
        //     const termMatch = matchExpr(g, t.term, sub);
        //     if (termMatch !== null) {
        //         count += termMatch
        //         sub = sub.slice(termMatch)
        //     } else {
        //         return null
        //     }
        // }
        //
        // return count
    }
};


const checkRuleExclusions = (g: Grammar, r: Rule, gen: string) => {
    for (let e of r.exclusions) {

        for (let i = 0; i < gen.length; i++) {
            const s = gen.substring(i);

            if (matchExpr(g, e, s) !== null) {
                return true;
            }
        }
    }

    return false;
};

const randomPick = <T>(array: T[]): T => {
    let random = Math.floor(Math.random() * array.length);
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
        case 'Ref':
            const rule = g.rules.find(r => r.name === e.rule);
            if (!rule) throw new Error(`Rule ${e.rule} not found`);
            return generateRule(g, rule);
        case "Seq":
            return e.items.map(t => generateExpr(g, t)).join('')
        case "Choice":
            const choice = g.useWeights ?
                weightedPick(e.items.map(c => [c.expr, c.weight])) :
                randomPick(e.items.map(c => c.expr))
            return generateExpr(g, choice)
        case "Quantifier":
            const n = Math.floor(Math.random() * (1 + e.max - e.min) + e.min)
            let s = ""
            for (let i = 0; i < n; i++) {
                s += generateExpr(g, e.term)
            }
            return s
    }
};

const generateRule = (g: Grammar, r: Rule): string => {
    let gen = generateExpr(g, r.expr);

    gen = applyRuleRewrites(g, r, gen);

    if (checkRuleExclusions(g, r, gen)) {
        console.log(`Rejected ${gen}`);
        return "rejected";
    } else {
        return gen;
    }
};

const applyRuleRewrites = (g: Grammar, rule: Rule, gen: string): string => {
    let result = gen.slice()

    for (const [match, replace] of rule.rewrites) {
        for (let i = 0; i < result.length; i++) {
            const s = result.slice(i);
            const exprMatch = matchExpr(g, match, s);
            if (exprMatch !== null) {
                const head = result.slice(0, i);
                const tail = result.slice(i + exprMatch);
                const gen = generateExpr(g, replace);

                console.log(`Rewrite Match (${i}, ${match}) \`${head}\` \`${gen}\` \`${tail}\``);

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

export const makeAtom = (atom: string): Expr => ({tag: "Atom", value: atom});
export const makeRef = (rule: string): Expr => ({tag: "Ref", rule: rule});
export const makeSeq = (items: Expr[]): Expr => ({tag: "Seq", items: items});

export const makeWeighted = (expr: Expr, weight: number | null): WeightedExpr => ({expr: expr, weight: weight ?? 1.0})
export const makeChoice = (items: Expr[]): Expr => ({tag: "Choice", items: items.map(makeWeighted)});
export const makeWeightedChoice = (items: WeightedExpr[]): Expr => ({tag: "Choice", items: items});
export const makeRepeat = (expr: Expr, count: number): Expr => makeRange(expr, count, count)
export const makeRange = (expr: Expr, min: number, max: number): Expr => ({
    tag: "Quantifier",
    term: expr,
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

export const simpleGrammar: Grammar = makeGrammar("Word", [
        makeRule(
            "Vowel",
            makeChoice(["a", "e", "i", "o", "u"].map(makeAtom)),
            [],
            []
        ),
        makeRule(
            "Consonant",
            makeChoice(["p", "k", "t", "s", "m", "n", "l", "w", "j"].map(makeAtom)),
            [],
            []
        ),
        makeRule(
            "Nasal",
            makeChoice(["n"].map(makeAtom)),
            [],
            []
        ),
        makeRule(
            "Word",
            makeSeq([
                makeRange(makeRef("Consonant"), 0, 1),
                makeRef("Vowel"),
                makeRange(makeRef("Nasal"), 0, 1),
            ]),
            [],
            []
        ),
    ],
);
