function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString()
  // Prisma.Decimal — duck-typed via toFixed and s property
  if (
    value !== null &&
    typeof value === "object" &&
    "toFixed" in value &&
    "s" in value
  ) {
    return parseFloat((value as { toString(): string }).toString())
  }
  return value
}

export function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, replacer)) as T
}
