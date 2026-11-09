import { describe, expect, it } from "vitest"
import { decodeCursor, encodeCursor } from "../src/core/cursor"
import { type CursorPosition, isPaginationError } from "../src/index"

describe("cursor codec", () => {
  it("round-trips every supported cursor value", () => {
    const position: CursorPosition = [
      { key: "name", direction: "asc", value: "Ada ✓" },
      { key: "score", direction: "desc", value: 1.5 },
      { key: "largeId", direction: "asc", value: 9_007_199_254_740_993n },
      { key: "createdAt", direction: "desc", value: new Date("2026-11-09T10:00:00.000Z") },
    ]

    expect(decodeCursor(encodeCursor(position))).toEqual(position)
  })

  it.each([undefined, null, 1, "", " ", "abc=", "a", "!", "a".repeat(4097)])(
    "rejects an invalid cursor input: %s",
    (cursor) => {
      expect(() => decodeCursor(cursor)).toThrowError(
        expect.objectContaining({ code: "INVALID_CURSOR" }),
      )
    },
  )

  it("distinguishes unsupported versions", () => {
    const cursor = encodeAsciiBase64Url(JSON.stringify({ v: 2, k: [] }))
    expect(() => decodeCursor(cursor)).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_CURSOR_VERSION" }),
    )
  })

  it.each([
    {},
    { v: 1 },
    { v: 1, k: [], extra: true },
    { v: 1, k: [["id", "asc", "number", null]] },
    { v: 1, k: [["id", "asc", "bigint", "01"]] },
    { v: 1, k: [["createdAt", "desc", "date", "not-a-date"]] },
    {
      v: 1,
      k: [
        ["id", "asc", "number", 1],
        ["id", "asc", "number", 2],
      ],
    },
  ])("rejects an invalid cursor payload", (payload) => {
    expect(() => decodeCursor(encodeAsciiBase64Url(JSON.stringify(payload)))).toThrowError(
      expect.objectContaining({ code: "INVALID_CURSOR" }),
    )
  })

  it("rejects invalid adapter positions", () => {
    const invalidPositions: unknown[] = [
      [],
      [{ key: "", direction: "asc", value: 1 }],
      [{ key: "id", direction: "sideways", value: 1 }],
      [{ key: "id", direction: "asc", value: Number.NaN }],
      [
        { key: "id", direction: "asc", value: 1 },
        { key: "id", direction: "desc", value: 2 },
      ],
    ]

    for (const position of invalidPositions) {
      expect(() => encodeCursor(position as CursorPosition)).toThrowError(
        expect.objectContaining({ code: "INVALID_CURSOR_POSITION" }),
      )
    }
  })

  it("creates native coded errors", () => {
    try {
      decodeCursor("invalid")
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
      expect(isPaginationError(error)).toBe(true)
    }
  })
})

function encodeAsciiBase64Url(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}
