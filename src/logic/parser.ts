import {Config} from "../pages/Home.tsx";
import {Rule as ConfigRule} from "../models/ui.tsx";
import {
    Expr, Grammar,
    makeAtom, makeGrammar,
    makeRange,
    makeRef, makeRule,
    makeSeq,
    makeWeighted,
    makeWeightedChoice, Rule,
    WeightedExpr
} from "../models/grammar.ts";
import {getRuleEdges} from "./wordgen.ts";
import {RulePattern} from "../models/ui.ts";

export class Parser {
    private currentPosition: number = 0;
    private input: string;

    constructor(input: string) {
        this.input = input;
    }

    private parseAtom(): Expr {
        let atomValue = ""
        let escaping = false

        if (!this.consume("'")) {
            throw new Error("Expected single quote to start atom");
        }

        while (this.hasMoreInput()) {
            const char = this.peek()!;

            if (char === "'") {
                if (escaping) {
                    atomValue += char
                    escaping = false
                    this.advancePosition(false)
                } else {
                    break
                }
            } else if (char === '\\') {
                if (escaping) {
                    atomValue += char
                    escaping = false
                    this.advancePosition(false)
                } else {
                    escaping = false
                    this.advancePosition(false)
                }
            } else {
                // Part of the atom; append the character and advance
                atomValue += char;
                this.advancePosition(false);
            }
        }

        if (!this.consume("'")) {
            throw new Error("Expected single quote to end atom");
        }

        return makeAtom(atomValue);
    }

    private parseRef(): Expr {
        let refName = '';

        if (this.isRefCharacter(this.peek(), true)) {
            refName += this.peek();
            this.advancePosition();
        }

        while (this.isRefCharacter(this.peek())) {
            refName += this.peek();
            this.advancePosition();
        }

        if (refName.length === 0) {
            throw new Error("Expected a reference name");
        }

        return makeRef(refName);
    }

    private isRefCharacter(char: string | null, lead: boolean | null = null): boolean {
        if (!char) {
            return false
        }

        if (lead) {
            return /^[A-Za-z_]+$/.test(char)
        } else {
            return /^[A-Za-z_0-9]+$/.test(char)
        }
    }

    public parseExpr(): Expr {
        // Start by parsing a sequence, as it has the highest precedence after quantification
        let expr = this.parseSequence();

        // If the next token is a ChoiceOperator, handle choice
        if (this.peek() === '/' || this.peek() === '*') {
            expr = this.parseChoice(expr);
        }


        return expr;
    }

    private parseSequence(): Expr {
        const items: Expr[] = [this.parseQuantifiedTerm()]; // Start with the first term, which might be quantified

        // While the next token indicates a sequence, keep parsing
        while (this.peek() === '.') {
            this.consume('.'); // Consume the SeqOperator
            items.push(this.parseQuantifiedTerm()); // Parse the next term in the sequence
        }

        // If only one item, no need to wrap in a Seq expression
        return items.length === 1 ? items[0] : makeSeq(items);
    }

    private parseQuantifiedTerm(): Expr {
        const term = this.parseTerm(); // Parse the base term (could be an Atom, Ref, or a nested expression)

        // If the next token is a QuantOperator, handle quantification
        if (this.peek() === '{') {
            const [min, max] = this.parseQuantifier()
            return makeRange(term, min, max)
        }

        return term;
    }

    private parseChoice(firstExpr: Expr): Expr {

        let firstWeight = 1.0
        if (this.consume('*')) {
            firstWeight = this.parseWeight()
        }

        const items: WeightedExpr[] = [makeWeighted(firstExpr, firstWeight)];

        while (this.consume('/')) {
            const expr = this.parseSequence()

            let weight = 1.0
            if (this.consume('*')) {
                weight = this.parseWeight()
            }

            items.push(makeWeighted(expr, weight))
        }

        return makeWeightedChoice(items);
    }

    private parseTerm(): Expr {
        const char = this.peek()

        if (!char) {
            return makeAtom("")
            // throw new Error("Expected an expression");
        }


        if (char === "'") {
            return this.parseAtom();
        } else if (char === "(") {
            return this.parseOption();
        } else if (char === "[") {
            return this.parseGroup();
        } else if (this.isRefCharacter(char)) {
            return this.parseRef();
        } else {
            throw new Error(`Unexpected character \`${char}\``);
        }
    }

    private parseOption(): Expr {

        if (!this.consume("(")) {
            throw new Error("Expected '(' at the start of an optional expression");
        }

        const expr = this.parseExpr(); // Parse the base term (could be an Atom, Ref, or a nested expression)

        if (!this.consume(")")) {
            throw new Error("Expected ')' at the end of an optional expression");
        }

        return makeRange(expr, 0, 1);
    }

    private parseGroup(): Expr {

        if (!this.consume("[")) {
            throw new Error("Expected '[' at the start of a group");
        }

        const expr = this.parseExpr(); // Parse the base term (could be an Atom, Ref, or a nested expression)

        if (!this.consume("]")) {
            throw new Error("Expected ']' at the end of a group");
        }

        return expr
    }

    private parseQuantifier(): [min: number, max: number] {
        // Ensure we are at the start of a quantifier expression
        if (!this.consume('{')) {
            throw new Error("Expected '{' at the start of quantifier expression");
        }

        // Parse the minimum and maximum values
        let min = 0;
        let max = 0;
        let minMaxStr = '';

        // Collect numbers or ':' until '}'
        while (this.peek() && this.peek() !== '}') {
            minMaxStr += this.input[this.currentPosition];
            this.advancePosition();
        }

        // Consume the closing '}'
        this.consume('}');

        const parts = minMaxStr.split(':');
        if (parts.length === 1) {
            min = max = parseInt(parts[0], 10);
        } else if (parts.length === 2) {
            min = parts[0] === "" ? 0 : parseInt(parts[0], 10);
            max = parseInt(parts[1], 10);
        } else {
            throw new Error("Invalid quantifier range");
        }

        // Validate min and max
        if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
            throw new Error("Invalid quantifier bounds");
        }

        return [min, max]
    }

    private parseWeight(): number {
        let weightStr = '';
        while (/^[0-9.]+$/.test(this.peek() ?? "")) {
            weightStr += this.input[this.currentPosition];
            this.advancePosition();
        }

        const weight = parseFloat(weightStr);
        if (isNaN(weight) || weight < 0) {
            throw new Error("Invalid weight value");
        }

        return weight;
    }

    private peek(): string | null {
        // Check if we've reached the end of the input
        if (this.currentPosition >= this.input.length) {
            return null; // Indicate no more characters are available
        }
        // Return the current character without advancing the position
        return this.input[this.currentPosition];
    }

    private consume(expected: string): boolean {
        // Check if the current character matches the expected value
        if (this.peek() === expected) {
            this.advancePosition(); // Consume the character by advancing the position
            return true;
        }
        return false; // The expected character does not match; do not advance
    }

    private advancePosition(skipWhitespace: boolean = true): void {
        if (this.hasMoreInput()) {
            this.currentPosition++
        }

        if (skipWhitespace) {
            this.skipWhiteSpace()
        }
    }

    private skipWhiteSpace(): void {
        while (this.isWhitespace(this.peek())) {
            this.advancePosition()
        }
    }

    private isWhitespace(char: string | null): boolean {
        return char === ' ' || char === '\n' || char === '\t'; // Add other characters as needed
    }

    private hasMoreInput(): boolean {
        return this.currentPosition < this.input.length
    }

    public parse(): Expr {
        const expr = this.parseExpr();

        if (this.currentPosition < this.input.length) {
            throw new Error(`Unexpected character \`${this.peek()}\``);
        }

        return expr;
    }
}

export const configToGrammar = (config: Config): Grammar | null => {
    if (!config.root) return null

    const rules = config.rules.map(configRuleToGrammarRule)

    const rulesNames = rules.map(r => r.name)
    for (const rule of rules) {
        const edges = getRuleEdges(rule)

        for (const e of edges) {
            if (!rulesNames.includes(e)) {
                throw new Error(`Unknown rule ${e}`)
            }
        }
    }


    return makeGrammar(config.root, rules, config.enableWeights)
}

const configRuleToGrammarRule = (rule: ConfigRule): Rule => {

    if (rule.terminalOnly) {
        const ruleExpr = terminalPatternsToExpr(rule.patterns)
        return makeRule(rule.name, ruleExpr, [], [])
    } else {
        const ruleExpr = rulePatternsToExpr(rule.patterns)
        const exclusions = rule.showExclusions ? rule.exclusions.map(p => parse(p.match)) : []
        const rewrites: [Expr, Expr][] = rule.showRewrites ? rule.rewrites.map(p => [parse(p.match), parse(p.replace)]) : []
        return makeRule(rule.name, ruleExpr, exclusions, rewrites)
    }

}

const terminalPatternsToExpr = (patterns: RulePattern[]): Expr => {
    return makeWeightedChoice(patterns.map(p => makeWeighted(makeAtom(p.pattern), p.weight)))
}

const rulePatternsToExpr = (patterns: RulePattern[]): Expr => {
    return makeWeightedChoice(patterns.map(p => makeWeighted(parse(p.pattern), p.weight)))
}

const parse = (src: string): Expr => (new Parser(src)).parse()

