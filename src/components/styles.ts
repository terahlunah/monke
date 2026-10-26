// Shared control styles. Tailwind only generates complete literal class names, so these are strings, not builders.
// Controls are taller on small screens for touch.

const control = "inline-flex items-center justify-center gap-1.5 rounded-md whitespace-nowrap disabled:opacity-40"

// Quiet bordered button for secondary actions.
export const buttonOutline = `${control} h-10 md:h-[34px] px-3 border border-line-strong hover:bg-white/5`

// The one filled action in a group.
export const buttonPrimary = `${control} h-10 md:h-[34px] px-3.5 bg-primary text-white font-semibold hover:bg-primary-hover`

// Text-only add action. Colour comes from the kind of thing being added.
export const buttonAdd = `${control} h-9 md:h-[30px] px-2.5 hover:bg-white/5`

export const textInput = "rounded-md border border-line-strong bg-background px-2.5 outline-0 placeholder:text-subtle"
