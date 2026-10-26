import {describe, expect, it} from "vitest"
import {moveItem, patchById, removeById} from "./list.ts"

describe("list helpers", () => {
    const items = [{id: "a", v: 1}, {id: "b", v: 2}, {id: "c", v: 3}]

    it("patchById merges into one item without mutating the input", () => {
        expect(patchById(items, "b", {v: 9})).toEqual([{id: "a", v: 1}, {id: "b", v: 9}, {id: "c", v: 3}])
        expect(items[1].v).toBe(2)
    })

    it("removeById drops one item without mutating the input", () => {
        expect(removeById(items, "a").map(i => i.id)).toEqual(["b", "c"])
        expect(items).toHaveLength(3)
    })

    it("moveItem relocates an item and ignores out-of-range indices", () => {
        expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4])
        expect(moveItem([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3])
        expect(moveItem([1, 2], 0, 5)).toEqual([1, 2])
    })
})
