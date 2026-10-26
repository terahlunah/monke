import {createContext, useContext} from "react"

// The element describing the current grammar error; inputs at fault point at it via aria-describedby.
export const GRAMMAR_ERROR_ID = "grammar-error"

export type ErrorLocation = { ruleId: string, itemId?: string }

export const GrammarErrorContext = createContext<ErrorLocation | null>(null)

// Props marking an input invalid when it is where the grammar error is. Pass no itemId for a rule's name input.
export const useInvalidProps = (ruleId: string, itemId?: string) => {
    const error = useContext(GrammarErrorContext)
    if (!error || error.ruleId !== ruleId) return {}
    if ((error.itemId ?? undefined) !== itemId) return {}
    return {"aria-invalid": true, "aria-describedby": GRAMMAR_ERROR_ID} as const
}
