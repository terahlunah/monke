export const updateAt = <T>(items: T[], index: number, item: T): T[] => items.with(index, item)

export const removeAt = <T>(items: T[], index: number): T[] => items.filter((_, i) => i !== index)
