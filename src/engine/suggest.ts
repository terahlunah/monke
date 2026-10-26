export const levenshtein = (a: string, b: string): number => {
    let prev = Array.from({length: b.length + 1}, (_, j) => j)
    for (let i = 1; i <= a.length; i++) {
        const row = [i]
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
        }
        prev = row
    }
    return prev[b.length]
}

// The closest candidate within `maxDistance` edits; ties go to the earliest candidate, which is the rule order
// people see on screen.
export const closest = (name: string, candidates: string[], maxDistance = 2): string | null => {
    let best: string | null = null
    let bestDistance = maxDistance + 1
    for (const c of candidates) {
        const d = levenshtein(name, c)
        if (d < bestDistance) {
            best = c
            bestDistance = d
        }
    }
    return best
}
