/** Runtime boundary checks, also narrowing unknown values for TypeScript. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert(isRecord(value), `${label}必须是对象`)
}

export function assertFiniteNumber(value: unknown, label: string, minimum = 0): asserts value is number {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= minimum, `${label}必须是大于等于${minimum}的有限数值`)
}
