import { describe, expect, it } from "vitest"
import { parseOffset } from "../src/core/offset"

const parseOffsetRuntime = parseOffset as (value: unknown) => number

describe("parseOffset", () => {
  it.each([
    [undefined, 0],
    [null, 0],
    [0, 0],
    ["0", 0],
    [" 0000 ", 0],
    [15, 15],
    ["15", 15],
    [" 0015 ", 15],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
  ])("parses %j as %d", (input, expected) => {
    expect(parseOffsetRuntime(input)).toBe(expected)
  })

  it.each([
    -1,
    1.5,
    1n,
    true,
    false,
    {},
    [],
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    "",
    " ",
    "+1",
    "-1",
    "1.0",
    "1e2",
    "0x10",
    "abc",
    String(Number.MAX_SAFE_INTEGER + 1),
  ])("falls back for the unsupported value %s", (input) => {
    expect(parseOffsetRuntime(input)).toBe(0)
  })
})
