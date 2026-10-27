// Pattern text is monospace so characters line up; the serif setting swaps it for the serif face, which reads IPA better.
export const valueFont = (enableSerif?: boolean) => enableSerif ? "font-serif" : "font-mono"

export const rowInput = "h-9 md:h-[30px] w-full min-w-0 rounded-md border border-line-strong bg-background px-2.5 outline-0"

// Same look as rowInput, but the height follows the wrapped text (at least one row).
export const rowInputMultiline = "min-h-9 md:min-h-[30px] w-full min-w-0 rounded-md border border-line-strong bg-background px-2.5 py-1.5 md:py-[3px] leading-[22px] outline-0"
