import {useEffect, useState} from "react";
import {encodeConfig} from "@/engine/sharing.ts";
import {exampleToConfig, ReferenceExample} from "./referenceExamples.ts";

export const shareUrl = async (example: ReferenceExample) =>
    `${window.location.origin}/${await encodeConfig(exampleToConfig(example))}`

// Encoding is async, so share URLs are computed once on mount; a missing entry means "not ready yet".
export const useExampleHrefs = (examples: ReferenceExample[]) => {
    const [hrefs, setHrefs] = useState<Record<string, string>>({})
    useEffect(() => {
        let cancelled = false
        Promise.all(examples.map(async e => [e.id, await shareUrl(e)] as const)).then(entries => {
            if (!cancelled) setHrefs(Object.fromEntries(entries))
        })
        return () => {
            cancelled = true
        }
    }, [examples])
    return hrefs
}
