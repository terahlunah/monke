import {
    Expr,
    Filter,
    makeAtom,
    makeBoundary,
    makeMatch,
    makeRange,
    makeRef,
    makeSeq,
    makeWeighted,
    makeWeightedChoice,
    WeightedExpr
} from "./grammar.ts";

export class Parser {
    private currentPosition: number = 0;
    private input: string;
    private ruleName: string;

    constructor(ruleName: string, input: string) {
        this.ruleName = ruleName;
        this.input = input;
    }

    // Positions are 1-based characters, as people count them when looking at the input.
    private error(message: string, position = this.currentPosition): never {
        throw new Error(`${message} (rule : '${this.ruleName}') at character ${position + 1}`);
    }

    // A term followed directly by another term is almost always a forgotten `.`; say so instead of
    // reporting the second term as an unexpected character.
    private checkMissingDot(termStart: number) {
        const next = this.peek()
        if (!next || !(this.isRefCharacter(next, true) || "'([#^$".includes(next))) return
        const before = this.input.slice(termStart, this.currentPosition).trim()
        const after = /^('(?:\\.|[^'\\])*'?|[A-Za-z_][A-Za-z_0-9]*|.)/.exec(this.input.slice(this.currentPosition))![0]
        this.error(`Missing \`.\` between \`${before}\` and \`${after}\`?`)
    }

    private parseAtom(): Expr {
        let atomValue = ""
        let escaping = false

        if (!this.consume("'", false)) {
            this.error("Expected single quote to start atom");
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
                    escaping = true
                    this.advancePosition(false)
                }
            } else {
                // Part of the atom; append the character and advance
                atomValue += char;
                escaping = false
                this.advancePosition(false);
            }
        }

        if (!this.consume("'")) {
            this.error("Expected single quote to end atom");
        }

        return makeAtom(atomValue);
    }

    private parseRef(): Expr {
        let refName = '';

        // Whitespace ends a name: `C V` is two references, not one named `CV`.
        if (this.isRefCharacter(this.peek(), true)) {
            refName += this.peek();
            this.advancePosition(false);
        }

        while (this.isRefCharacter(this.peek())) {
            refName += this.peek();
            this.advancePosition(false);
        }
        this.skipWhiteSpace();

        if (refName.length === 0) {
            this.error("Expected a reference name");
        }

        return makeRef(refName, this.peek() === "<" ? this.parseFilters() : []);
    }

    // `<front, !round>`: feature values the referenced rule's alternatives must (or, with `!`, must not) carry.
    private parseFilters(): Filter[] {
        this.consume("<")
        const filters: Filter[] = []
        do {
            const negate = this.consume("!")
            let value = ""
            if (this.isRefCharacter(this.peek(), true)) {
                while (this.isRefCharacter(this.peek())) {
                    value += this.peek()
                    this.advancePosition(false)
                }
            }
            this.skipWhiteSpace()
            if (value === "") this.error("Expected a feature value name in `<...>`")
            filters.push({value, negate})
        } while (this.consume(","))
        if (!this.consume(">")) this.error("Expected `,` or `>` to end the feature filter")
        return filters
    }

    private parseMatch(): Expr {
        let indexString = ''

        if (!this.consume('#')) {
            this.error("Expected number sign to start match");
        }

        while (this.hasMoreInput()) {
            const char = this.peek()!;

            if (char === '#') {
                break
            } else {
                // Part of the index; append the character and advance
                indexString += char;
                this.advancePosition(false);
            }
        }

        if (!this.consume('#')) {
            this.error("Expected number sign to end match");
        }

        if (!/^\d+$/.test(indexString.trim())) {
            this.error(`Invalid match index '#${indexString}#'`);
        }

        return makeMatch(parseInt(indexString, 10));
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

    public parseExpr(option: boolean = false): Expr {
        // Start by parsing a sequence, as it has the highest precedence after quantification
        let expr = this.parseSequence();

        // If the next token is a ChoiceOperator, handle choice
        if (!option && (this.peek() === '/' || this.peek() === '*' || this.peek() === '~')) {
            expr = this.parseChoice(expr);
        }


        return expr;
    }

    private parseSequence(): Expr {
        let termStart = this.currentPosition
        const items: Expr[] = [this.parseQuantifiedTerm()]; // Start with the first term, which might be quantified

        // While the next token indicates a sequence, keep parsing
        while (this.peek() === '.') {
            this.consume('.'); // Consume the SeqOperator
            termStart = this.currentPosition
            items.push(this.parseQuantifiedTerm()); // Parse the next term in the sequence
        }
        this.checkMissingDot(termStart)

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
        const items: WeightedExpr[] = [this.parseAlternativeSuffix(firstExpr)];

        while (this.consume('/')) {
            items.push(this.parseAlternativeSuffix(this.parseSequence()))
        }

        return makeWeightedChoice(items);
    }

    // `*N` then `~F`, both optional. One order only, so a pattern reads the same everywhere.
    private parseAlternativeSuffix(expr: Expr): WeightedExpr {
        const weight = this.consume('*') ? this.parseWeight() : 1.0
        if (!this.consume('~')) return makeWeighted(expr, weight)
        const repeat = this.parseNumber("Invalid repeat factor")
        if (this.peek() === '*') this.error("Write the weight before the repeat factor, as in `x*2~0.5`")
        return {...makeWeighted(expr, weight), repeat}
    }

    private parseTerm(): Expr {
        const char = this.peek()

        if (!char) {
            return makeAtom("")
        }


        if (char === "'") {
            return this.parseAtom();
        } else if (char === "(") {
            return this.parseOption();
        } else if (char === "[") {
            return this.parseGroup();
        } else if (char === "#") {
            return this.parseMatch();
        } else if (char === "^" || char === "$") {
            this.advancePosition();
            return makeBoundary(char === "^" ? "start" : "end");
        } else if (this.isRefCharacter(char)) {
            return this.parseRef();
        } else {
            this.error(`Unexpected character \`${char}\``);
        }
    }

    private parseOption(): Expr {

        if (!this.consume("(")) {
            this.error("Expected '(' at the start of an optional expression");
        }

        const expr = this.parseExpr(true); // Parse the base term (could be an Atom, Ref, or a nested expression)

        let weight = 0.5
        if (this.consume('*')) {
            weight = this.parseWeight()
            if (weight > 1) {
                this.error(`Optional probability ${weight} must be between 0 and 1`)
            }
        }

        if (!this.consume(")")) {
            this.error("Expected ')' at the end of an optional expression");
        }

        return makeWeightedChoice([makeWeighted(expr, weight), makeWeighted(makeAtom(""), 1 - weight)])
    }

    private parseGroup(): Expr {

        if (!this.consume("[")) {
            this.error("Expected '[' at the start of a group");
        }

        const expr = this.parseExpr(); // Parse the base term (could be an Atom, Ref, or a nested expression)

        if (!this.consume("]")) {
            this.error("Expected ']' at the end of a group");
        }

        return expr
    }

    private parseQuantifier(): [min: number, max: number] {
        // Ensure we are at the start of a quantifier expression
        if (!this.consume('{')) {
            this.error("Expected '{' at the start of quantifier expression");
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
            this.error("Invalid quantifier range");
        }

        // Validate min and max
        if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
            this.error("Invalid quantifier bounds");
        }

        return [min, max]
    }

    private parseWeight(): number {
        return this.parseNumber("Invalid weight value")
    }

    private parseNumber(message: string): number {
        let weightStr = '';
        while (/^[0-9.]+$/.test(this.peek() ?? "")) {
            weightStr += this.input[this.currentPosition];
            this.advancePosition();
        }

        const weight = parseFloat(weightStr);
        if (isNaN(weight) || weight < 0) {
            this.error(message);
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

    private consume(expected: string, skipWhitespace: boolean = true): boolean {
        // Check if the current character matches the expected value
        if (this.peek() === expected) {
            this.advancePosition(skipWhitespace); // Consume the character by advancing the position
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
            this.error(`Unexpected character \`${this.peek()}\``);
        }

        return expr;
    }
}

export const parsePattern = (ruleName: string, src: string): Expr => new Parser(ruleName, src).parse()
