import {createContext, useContext} from "react"

// The global alert announcing the current grammar error.
export const GRAMMAR_ERROR_ID = "grammar-error"
// The copy of the message shown next to the input at fault; that input points at it via aria-describedby.
export const INLINE_GRAMMAR_ERROR_ID = "grammar-error-inline"

export type ErrorLocation = { ruleId: string, itemId?: string, message: string }

export const GrammarErrorContext = createContext<ErrorLocation | null>(null)

export const useGrammarError = () => useContext(GrammarErrorContext)

// Props marking an input invalid when it is where the grammar error is. Pass no itemId for a rule's name input.
export const useInvalidProps = (ruleId: string, itemId?: string) => {
    const error = useContext(GrammarErrorContext)
    if (!error || error.ruleId !== ruleId) return {}
    if ((error.itemId ?? undefined) !== itemId) return {}
    return {"aria-invalid": true, "aria-describedby": INLINE_GRAMMAR_ERROR_ID} as const
}
