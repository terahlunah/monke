import {
    makeChoice,
    makeSeq,
    makeAtom,
    makeRef,
    Expr,
    makeRange,
    makeWeighted,
    WeightedExpr,
    makeWeightedChoice
} from "./wordgen.ts";

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
        if (this.peek() === '/' || this.peek() === '%') {
            expr = this.parseChoice(expr);
        }


        return expr;
    }

    private parseSequence(): Expr {
        let items: Expr[] = [this.parseQuantifiedTerm()]; // Start with the first term, which might be quantified

        // While the next token indicates a sequence, keep parsing
        while (this.peek() === '.') {
            this.consume('.'); // Consume the SeqOperator
            items.push(this.parseQuantifiedTerm()); // Parse the next term in the sequence
        }

        // If only one item, no need to wrap in a Seq expression
        return items.length === 1 ? items[0] : makeSeq(items);
    }

    private parseQuantifiedTerm(): Expr {
        let term = this.parseTerm(); // Parse the base term (could be an Atom, Ref, or a nested expression)

        // If the next token is a QuantOperator, handle quantification
        if (this.peek() === '{') {
            let [min, max] = this.parseQuantifier()
            return makeRange(term, min, max)
        }

        return term;
    }

    private parseChoice(firstExpr: Expr): Expr {

        let firstWeight = 1.0
        if (this.consume('%')) {
            firstWeight = this.parseWeight()
        }

        let items: WeightedExpr[] = [makeWeighted(firstExpr, firstWeight)];

        while (this.consume('/')) {
            const expr = this.parseSequence()

            let weight = 1.0
            if (this.consume('%')) {
                weight = this.parseWeight()
            }

            items.push(makeWeighted(expr, weight))
        }

        return makeWeightedChoice(items);
    }

    private parseTerm(): Expr {
        let char = this.peek()

        if (!char) {
            throw new Error("Expected an expression");
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

        let expr = this.parseExpr(); // Parse the base term (could be an Atom, Ref, or a nested expression)

        if (!this.consume(")")) {
            throw new Error("Expected ')' at the end of an optional expression");
        }

        return makeRange(expr, 0, 1);
    }

    private parseGroup(): Expr {

        if (!this.consume("[")) {
            throw new Error("Expected '[' at the start of a group");
        }

        let expr = this.parseExpr(); // Parse the base term (could be an Atom, Ref, or a nested expression)

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
        while (this.peek() !== '}') {
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

        let weight = parseFloat(weightStr);
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

    // Additional utility methods as needed for error handling, checking end of input, etc.
}
