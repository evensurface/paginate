import { describe, expect, it } from "vitest"
import { calculateOffset, parseLimit, parsePage, resolvePage } from "../src/core/page"

describe("parsePage", () => {
  it.each([
    [undefined, 1],
    [null, 1],
    ["", 1],
    ["1.5", 1],
    ["1e2", 1],
    [0, 1],
    [-2, 1],
    [2.5, 1],
    [" 3 ", 3],
    [4, 4],
  ])("parses %j as %d", (input, expected) => {
    expect(parsePage(input)).toBe(expected)
  })

  it("rejects integers outside the safe range", () => {
    expect(parsePage("9007199254740992")).toBe(1)
  })
})

describe("parseLimit", () => {
  it("uses defaults and clamps valid values to the configured range", () => {
    expect(parseLimit(undefined)).toBe(20)
    expect(parseLimit(500)).toBe(100)
    expect(parseLimit(5, { minLimit: 10, defaultLimit: 20 })).toBe(10)
    expect(parseLimit(50, { maxLimit: 30, defaultLimit: 20 })).toBe(30)
  })

  it("falls back for invalid values", () => {
    expect(parseLimit(0)).toBe(20)
    expect(parseLimit("abc")).toBe(20)
  })

  it("rejects invalid page-size configuration", () => {
    expect(() => parseLimit(10, { minLimit: 20, maxLimit: 10 })).toThrow(RangeError)
    expect(() => parseLimit(10, { minLimit: 10, defaultLimit: 5 })).toThrow(RangeError)
  })
})

describe("offset and page boundaries", () => {
  it("calculates offsets for positive safe integers", () => {
    expect(calculateOffset(1, 20)).toBe(0)
    expect(calculateOffset(5, 10)).toBe(40)
  })

  it("rejects invalid inputs and unsafe offsets", () => {
    expect(() => calculateOffset(0, 20)).toThrow(RangeError)
    expect(() => calculateOffset(1, 0)).toThrow(RangeError)
    expect(() => calculateOffset(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError)
  })

  it("clamps pages to the available range", () => {
    expect(resolvePage(3, 10)).toBe(3)
    expect(resolvePage(15, 10)).toBe(10)
    expect(resolvePage(5, 0)).toBe(1)
  })
})
