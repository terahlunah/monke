type Identified = { id: string }

export const patchById = <T extends Identified>(items: T[], id: string, patch: Partial<Omit<NoInfer<T>, "id">>): T[] =>
    items.map(it => it.id === id ? {...it, ...patch} : it)

export const removeById = <T extends Identified>(items: T[], id: string): T[] => items.filter(it => it.id !== id)

export const moveItem = <T>(items: T[], from: number, to: number): T[] => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items
    const next = items.slice()
    next.splice(to, 0, ...next.splice(from, 1))
    return next
}
