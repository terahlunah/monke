import {useState} from "react";
import {AwkwordsImport, AwkwordsWarning} from "@/engine/awkwords.ts";

export const MAX_WORD_COUNT = 10000

// Word counts are whole numbers in 1..MAX_WORD_COUNT; anything unparsable falls back to a small default.
export const clampWordCount = (value: string): number => {
    const n = Math.trunc(Number(value))
    if (value.trim() === "" || Number.isNaN(n)) return 10
    return Math.min(Math.max(n, 1), MAX_WORD_COUNT)
}

export type OutputStyle = "paragraph" | "list"

// How the words are shown. It is not part of Config (so not in share links) but both the toolbar, whose Awkwords
// import sets it, and the output panel need it, so Home owns it.
export const useGeneratorView = () => {
    const [wordCount, setWordCount] = useState("50")
    const [outputStyle, setOutputStyle] = useState<OutputStyle>("paragraph")
    const [filterDuplicates, setFilterDuplicates] = useState(false)
    // Kept until dismissed: a toast would vanish before a long list can be read.
    const [importNotes, setImportNotes] = useState<AwkwordsWarning[]>([])

    const applyAwkwords = (result: AwkwordsImport) => {
        if (result.wordCount !== undefined) setWordCount(String(clampWordCount(String(result.wordCount))))
        if (result.filterDuplicates !== undefined) setFilterDuplicates(result.filterDuplicates)
        if (result.listOutput !== undefined) setOutputStyle(result.listOutput ? "list" : "paragraph")
        setImportNotes(result.warnings)
    }

    return {
        wordCount, setWordCount,
        outputStyle, setOutputStyle,
        filterDuplicates, setFilterDuplicates,
        importNotes, setImportNotes,
        applyAwkwords,
    }
}

export type GeneratorView = ReturnType<typeof useGeneratorView>
