import {Feature} from "@/engine/config.ts";

// Value names in declaration order, for the `[front, flat]` display. Ids without a declaration are skipped.
export const valueNames = (features: Feature[], ids: string[] | undefined): string[] => {
    const set = new Set(ids ?? [])
    return features.flatMap(f => f.values.filter(v => set.has(v.id)).map(v => v.name || "unnamed"))
}
