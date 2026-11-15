export const DAY = 24 * 60 * 60_000

export function startOfDay(time: number): number {
  return Math.floor(time / DAY) * DAY
}
