import {INLINE_GRAMMAR_ERROR_ID, useGrammarError} from "./grammarError.ts";

type InlineGrammarErrorProps = {
    ruleId: string
    // Shows the error when it is on one of these items; `null` matches an error on the rule itself.
    itemIds: (string | null)[]
}

// Not a live region: the global alert already announces the error, this copy only sits where the eye and
// aria-describedby need it.
export const InlineGrammarError = ({ruleId, itemIds}: InlineGrammarErrorProps) => {
    const error = useGrammarError()
    if (!error || error.ruleId !== ruleId || !itemIds.includes(error.itemId ?? null)) return null
    return <p id={INLINE_GRAMMAR_ERROR_ID} className="text-sm text-accent-danger-text">{error.message}</p>
}
