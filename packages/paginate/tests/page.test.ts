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

  it.each([
    ["0003", 3],
    ["\t3\n", 3],
    [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ])("accepts the positive safe integer %j", (input, expected) => {
    expect(parsePage(input)).toBe(expected)
  })

  it.each([
    true,
    false,
    {},
    [],
    1n,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    " ",
    "+1",
    "1.0",
    "1e2",
    "0x10",
    "-1",
  ])("falls back for the unsupported value %s", (input) => {
    expect(parsePage(input)).toBe(1)
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
    expect(parseLimit("1e2")).toBe(20)
    expect(parseLimit(1n)).toBe(20)
  })

  it("parses before clamping valid numeric strings", () => {
    expect(parseLimit(" 0005 ", { minLimit: 10, defaultLimit: 20 })).toBe(10)
    expect(parseLimit("500", { maxLimit: 30, defaultLimit: 20 })).toBe(30)
  })

  it("rejects invalid page-size configuration", () => {
    expect(() => parseLimit(10, { minLimit: 20, maxLimit: 10 })).toThrow(RangeError)
    expect(() => parseLimit(10, { minLimit: 10, defaultLimit: 5 })).toThrow(RangeError)
  })

  it("preserves exact configuration errors and validation precedence", () => {
    const invalidBoundaries = () =>
      parseLimit("invalid", { minLimit: 20, maxLimit: 10, defaultLimit: 5 })
    expect(invalidBoundaries).toThrow(RangeError)
    expect(invalidBoundaries).toThrow("Invalid page size boundaries.")

    const invalidDefault = () => parseLimit("invalid", { minLimit: 10, defaultLimit: 5 })
    expect(invalidDefault).toThrow(RangeError)
    expect(invalidDefault).toThrow("Default page size must be within the allowed range.")
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

  it("preserves offset error messages and validation precedence", () => {
    const invalidPageAndLimit = () => calculateOffset(0, 0)
    expect(invalidPageAndLimit).toThrow(RangeError)
    expect(invalidPageAndLimit).toThrow("Page must be a positive safe integer.")

    const invalidLimit = () => calculateOffset(1, 0)
    expect(invalidLimit).toThrow(RangeError)
    expect(invalidLimit).toThrow("Limit must be a positive safe integer.")

    const unsafeOffset = () => calculateOffset(Number.MAX_SAFE_INTEGER, 2)
    expect(unsafeOffset).toThrow(RangeError)
    expect(unsafeOffset).toThrow("Calculated offset exceeds the maximum safe integer.")
  })

  it("allows the largest page whose offset remains safe", () => {
    expect(calculateOffset(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER - 1)
  })

  it("clamps pages to the available range", () => {
    expect(resolvePage(3, 10)).toBe(3)
    expect(resolvePage(15, 10)).toBe(10)
    expect(resolvePage(5, 0)).toBe(1)
  })

  it("preserves page-resolution errors and precedence", () => {
    const invalidPageAndTotal = () => resolvePage(0, -1)
    expect(invalidPageAndTotal).toThrow(RangeError)
    expect(invalidPageAndTotal).toThrow("Page must be a positive safe integer.")

    const invalidTotal = () => resolvePage(1, -1)
    expect(invalidTotal).toThrow(RangeError)
    expect(invalidTotal).toThrow("Total pages must be a non-negative safe integer.")
  })
})
