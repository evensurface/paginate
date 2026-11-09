import { annotatePaginationError, getPaginationErrorMessage } from "./errors"
import type { CursorDirection, CursorKey, CursorPosition, CursorValue } from "./types"

const CURSOR_VERSION = 1
const MAX_CURSOR_LENGTH = 4096
const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

type SerializedCursorKey = readonly [
  key: string,
  direction: CursorDirection,
  type: "string" | "number" | "bigint" | "date",
  value: string | number,
]

interface SerializedCursor {
  v: number
  k: SerializedCursorKey[]
}

export function encodeCursor(position: CursorPosition): string {
  const keys = validatePosition(position)
  const payload: SerializedCursor = {
    v: CURSOR_VERSION,
    k: keys.map(serializeKey),
  }
  const encoded = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)))

  if (encoded.length > MAX_CURSOR_LENGTH) {
    throw invalidCursorPosition()
  }

  return encoded
}

export function decodeCursor(cursor: unknown): CursorPosition {
  if (
    typeof cursor !== "string" ||
    cursor.length === 0 ||
    cursor.length > MAX_CURSOR_LENGTH ||
    cursor.trim() !== cursor ||
    !/^[A-Za-z0-9_-]+$/.test(cursor)
  ) {
    throw invalidCursor()
  }

  let payload: unknown

  try {
    const bytes = decodeBase64Url(cursor)

    if (encodeBase64Url(bytes) !== cursor) {
      throw new TypeError("Cursor is not canonical Base64URL.")
    }

    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    payload = JSON.parse(json)
  } catch {
    throw invalidCursor()
  }

  if (
    !isRecord(payload) ||
    Object.keys(payload).length !== 2 ||
    !("v" in payload) ||
    !("k" in payload) ||
    typeof payload.v !== "number"
  ) {
    throw invalidCursor()
  }

  if (payload.v !== CURSOR_VERSION) {
    throw annotatePaginationError(
      new RangeError(getPaginationErrorMessage("UNSUPPORTED_CURSOR_VERSION")),
      "UNSUPPORTED_CURSOR_VERSION",
    )
  }

  if (!Array.isArray(payload.k) || payload.k.length === 0) {
    throw invalidCursor()
  }

  const keys: CursorKey[] = []
  const names = new Set<string>()

  for (const value of payload.k) {
    const key = deserializeKey(value)

    if (names.has(key.key)) {
      throw invalidCursor()
    }

    names.add(key.key)
    keys.push(key)
  }

  return keys as unknown as CursorPosition
}

function validatePosition(position: unknown): CursorPosition {
  if (!Array.isArray(position) || position.length === 0) {
    throw invalidCursorPosition()
  }

  const names = new Set<string>()

  for (const entry of position) {
    if (
      !isRecord(entry) ||
      typeof entry.key !== "string" ||
      entry.key.length === 0 ||
      entry.key.trim() !== entry.key ||
      (entry.direction !== "asc" && entry.direction !== "desc") ||
      !isCursorValue(entry.value) ||
      names.has(entry.key)
    ) {
      throw invalidCursorPosition()
    }

    names.add(entry.key)
  }

  return position as unknown as CursorPosition
}

function serializeKey(key: CursorKey): SerializedCursorKey {
  if (typeof key.value === "string") {
    return [key.key, key.direction, "string", key.value]
  }

  if (typeof key.value === "number") {
    return [key.key, key.direction, "number", key.value]
  }

  if (typeof key.value === "bigint") {
    return [key.key, key.direction, "bigint", key.value.toString()]
  }

  return [key.key, key.direction, "date", key.value.toISOString()]
}

function deserializeKey(value: unknown): CursorKey {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    typeof value[0] !== "string" ||
    value[0].length === 0 ||
    value[0].trim() !== value[0] ||
    (value[1] !== "asc" && value[1] !== "desc")
  ) {
    throw invalidCursor()
  }

  const [key, direction, type, serialized] = value
  let cursorValue: CursorValue

  if (type === "string" && typeof serialized === "string") {
    cursorValue = serialized
  } else if (type === "number" && typeof serialized === "number" && Number.isFinite(serialized)) {
    cursorValue = serialized
  } else if (
    type === "bigint" &&
    typeof serialized === "string" &&
    /^(?:0|-?[1-9]\d*)$/.test(serialized)
  ) {
    cursorValue = BigInt(serialized)
  } else if (type === "date" && typeof serialized === "string") {
    const date = new Date(serialized)

    if (!Number.isFinite(date.getTime()) || date.toISOString() !== serialized) {
      throw invalidCursor()
    }

    cursorValue = date
  } else {
    throw invalidCursor()
  }

  return { key, direction, value: cursorValue }
}

function isCursorValue(value: unknown): value is CursorValue {
  return (
    typeof value === "string" ||
    typeof value === "bigint" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function encodeBase64Url(bytes: Uint8Array): string {
  let result = ""

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    const bits = (first << 16) | ((second ?? 0) << 8) | (third ?? 0)

    result += base64Alphabet[(bits >> 18) & 63]
    result += base64Alphabet[(bits >> 12) & 63]

    if (second !== undefined) {
      result += base64Alphabet[(bits >> 6) & 63]
    }

    if (third !== undefined) {
      result += base64Alphabet[bits & 63]
    }
  }

  return result
}

function decodeBase64Url(value: string): Uint8Array {
  if (value.length % 4 === 1) {
    throw new TypeError("Invalid Base64URL length.")
  }

  const bytes: number[] = []

  for (let index = 0; index < value.length; index += 4) {
    const remaining = Math.min(4, value.length - index)
    const first = base64Value(value[index])
    const second = base64Value(value[index + 1])
    const third = remaining > 2 ? base64Value(value[index + 2]) : 0
    const fourth = remaining > 3 ? base64Value(value[index + 3]) : 0
    const bits = (first << 18) | (second << 12) | (third << 6) | fourth

    bytes.push((bits >> 16) & 255)

    if (remaining > 2) {
      bytes.push((bits >> 8) & 255)
    }

    if (remaining > 3) {
      bytes.push(bits & 255)
    }
  }

  return Uint8Array.from(bytes)
}

function base64Value(character: string | undefined): number {
  if (character === undefined) {
    throw new TypeError("Invalid Base64URL character.")
  }

  const value = base64Alphabet.indexOf(character)

  if (value < 0) {
    throw new TypeError("Invalid Base64URL character.")
  }

  return value
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function invalidCursor() {
  return annotatePaginationError(
    new RangeError(getPaginationErrorMessage("INVALID_CURSOR")),
    "INVALID_CURSOR",
  )
}

function invalidCursorPosition() {
  return annotatePaginationError(
    new RangeError(getPaginationErrorMessage("INVALID_CURSOR_POSITION")),
    "INVALID_CURSOR_POSITION",
  )
}
