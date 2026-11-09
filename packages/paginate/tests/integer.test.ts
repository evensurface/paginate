import { describe, expect, it } from "vitest"
import {
  isNonNegativeSafeInteger,
  isPositiveSafeInteger,
  toPositiveSafeInteger,
} from "../src/core/integer"

describe("integer utilities", () => {
  it("recognizes positive safe integers", () => {
    expect(isPositiveSafeInteger(1)).toBe(true)
    expect(isPositiveSafeInteger(Number.MAX_SAFE_INTEGER)).toBe(true)

    for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "1"]) {
      expect(isPositiveSafeInteger(value)).toBe(false)
    }
  })

  it("recognizes non-negative safe integers", () => {
    expect(isNonNegativeSafeInteger(0)).toBe(true)
    expect(isNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER)).toBe(true)

    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "0"]) {
      expect(isNonNegativeSafeInteger(value)).toBe(false)
    }
  })

  it("converts only positive safe numbers and trimmed decimal digit strings", () => {
    expect(toPositiveSafeInteger(3)).toBe(3)
    expect(toPositiveSafeInteger(" 0003 ")).toBe(3)
    expect(toPositiveSafeInteger(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)

    for (const value of [
      undefined,
      null,
      0,
      -1,
      1.5,
      1n,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "",
      " ",
      "+1",
      "-1",
      "1.0",
      "1e2",
      "0x10",
      String(Number.MAX_SAFE_INTEGER + 1),
    ]) {
      expect(toPositiveSafeInteger(value)).toBeUndefined()
    }
  })
})
