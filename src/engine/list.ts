export const updateAt = <T>(items: T[], index: number, item: T): T[] => items.map((existing, i) => i === index ? item : existing)

export const removeAt = <T>(items: T[], index: number): T[] => items.filter((_, i) => i !== index)
