export function pause(ms = 20): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
