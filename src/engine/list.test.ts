import {describe, expect, it} from "vitest"
import {removeAt, updateAt} from "./list.ts"

describe("list helpers", () => {
    it("updateAt replaces one item without mutating the input", () => {
        const items = [1, 2, 3]
        expect(updateAt(items, 1, 9)).toEqual([1, 9, 3])
        expect(items).toEqual([1, 2, 3])
    })

    it("removeAt drops one item without mutating the input", () => {
        const items = ["a", "b", "c"]
        expect(removeAt(items, 0)).toEqual(["b", "c"])
        expect(items).toEqual(["a", "b", "c"])
    })
})
