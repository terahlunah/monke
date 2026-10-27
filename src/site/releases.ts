// The single source of truth for release notes: the in-app "What's new" panel, the /news/ page and the Atom feed
// all read it. Newest first. Items may use `code` spans and (#N) issue references (see ReleaseText).
// The newest entry's date and version also drive the unread dot, so a new release needs nothing but an entry here.

export type ReleaseSection = { title: string, items: string[] }

export type Release = {
    version: string
    // ISO calendar date, YYYY-MM-DD.
    date: string
    summary?: string
    sections: ReleaseSection[]
}

export const releases: Release[] = [
    {
        version: "2.0.0",
        date: "2026-10-27",
        summary: "Monke v2 is a big update: a redesigned editor, phonological features for vowel harmony and branching, an Awkwords importer, and many fixes to the grammar engine.",
        sections: [
            {
                title: "New",
                items: [
                    "Phonological features: declare features like `harmony: front | back`, list on each rule the features that sort its rows, tag terminals or patterns, and let a rule choose a value for everything inside it. Vowel harmony and consistent branching without duplicating rules. Filter references through every rule below them with `Vowel<front>` (only front) or `Vowel<!back>` (anything but back). Unnamed features and unchosen values give warnings instead of stopping generation.",
                    "Import from Awkwords: open an .awkw file or paste a pattern. Subpatterns become rules, filters become exact exclusions, and anything that can't be translated exactly is listed for review.",
                    "Words update as you edit. Output is driven by a seed you can set and share, so a link always shows the same words; New words picks a fresh seed.",
                    "Generate all lists every distinct word a grammar can make (up to 10,000), with rewrites and exclusions applied.",
                    "Word boundaries `^` and `$` in rewrites and exclusions, e.g. ban a word-final h with `'h'.$` (#21).",
                    "Repeat factors lower the chance of picking the same thing twice in a word: a Repeat field next to each row's Weight, or `x~0.5` on an alternative inside a pattern (#24).",
                    "Back-references in exclusions: `C.#0#` bans doubled consonants like pp but allows pt (#14).",
                    "\"Repeat rewrites until nothing changes\" option, so a rewrite can act on another rewrite's output (#18).",
                    "Add several terminals at once by typing them separated by spaces.",
                    "Browser Back and Forward undo and redo your edits.",
                ],
            },
            {
                title: "Redesigned",
                items: [
                    "New editor layout: a toolbar for examples, import, export and sharing; rules as clear vertical lists; one colour per kind of thing (terminals, patterns, rewrites, exclusions).",
                    "Examples menu with the toki pona grammars and every recipe from the Reference.",
                    "Settings split: grammar settings next to the grammar, display settings in the ⚙ menu; Paragraph/List switch next to the words.",
                    "The Guide became the Reference: rewritten from scratch, checked against the engine, with tested examples you can open in a new tab and a \"Coming from Awkwords\" section.",
                    "Reference, FAQ and an Awkwords comparison are also available as standalone pages.",
                ],
            },
            {
                title: "Accessibility",
                items: [
                    "Full keyboard support, including reordering with move buttons or keyboard drag, with spoken announcements.",
                    "Screen reader improvements: labelled controls, announced results and errors, landmarks and headings.",
                    "WCAG AA colour contrast throughout.",
                ],
            },
            {
                title: "Fixes",
                items: [
                    "Escapes in quoted text work: `'it\\'s'`.",
                    "Rewrites can no longer freeze the page, and no longer rewrite their own output.",
                    "Exclusions and rewrites match through nested rules and try every alternative of a choice (#22).",
                    "Unweighted choices are now equally likely.",
                    "Share links no longer break with more than 127 rules or long text; old links keep working.",
                    "Cloned rules no longer interfere with the original; reordering keeps each item's settings.",
                    "Clearer errors, shown under the field at fault, with hints like \"Did you mean `Vowel`?\" and \"Missing `.` between `C` and `V`?\".",
                    "Duplicate rule names and optional weights above 1 are now reported.",
                    "Importing a broken file shows an error instead of failing silently; older .monke files load again.",
                ],
            },
            {
                title: "Under the hood",
                items: [
                    "Much faster first load; the page works without layout jumps.",
                    "Grammars in share links are never sent to Google Analytics.",
                    "Moved hosting to Cloudflare; up-to-date dependencies; hundreds of automated tests.",
                ],
            },
        ],
    },
    {
        version: "1.0.0",
        date: "2024-02-24",
        sections: [
            {
                title: "First release",
                items: [
                    "The first version of Monke: a grammar-based word generator for conlangs.",
                    "Named rules built from patterns: quoted text, references, sequences, choices, optionals, groups, repetition.",
                    "Probability weights, rewrites and exclusions per rule, including back-references in rewrites.",
                    "Share your grammar with a link; export and import .monke files.",
                    "Toki Pona example grammar to start from.",
                ],
            },
        ],
    },
]

export const newestRelease = releases[0]

export const releaseAnchor = (r: Release): string => `v${r.version.replace(/\./g, "-")}`

// "<date>#<version>": compares as a string by date first (ISO dates sort lexically), then version text, so the
// stored value of the newest seen entry says whether a newer one exists.
export const releaseStamp = (r: Release): string => `${r.date}#${r.version}`

const versionParts = (v: string) => v.split(".").map(Number)

// True when stamp `a` is newer than `b`: by date, then by numeric version (so 2.10.0 beats 2.9.0).
export const stampNewer = (a: string, b: string): boolean => {
    const [dateA, verA = ""] = a.split("#")
    const [dateB, verB = ""] = b.split("#")
    if (dateA !== dateB) return dateA > dateB
    const pa = versionParts(verA), pb = versionParts(verB)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0)
        if (d !== 0) return d > 0
    }
    return false
}

export const formatReleaseDate = (iso: string): string =>
    // Parsed and shown in UTC so the calendar day never shifts with the viewer's time zone.
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", {year: "numeric", month: "long", day: "numeric", timeZone: "UTC"})
