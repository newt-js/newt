export function errorCode(error: unknown): string {
  const { errno, code } = (error ?? {}) as { errno?: unknown, code?: unknown }
  return String(errno ?? code ?? '')
}
