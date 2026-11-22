/** The pages a pagination shows around the current one, with `null` where it skips some: 1 … 4 5 6 … 20. */
export function pagesShown(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const near = [current - 1, current, current + 1].filter(page => page > 1 && page < total)
  const pages: (number | null)[] = [1]
  if (near[0] !== undefined && near[0] > 2) pages.push(null)
  pages.push(...near)
  const lastNear = near[near.length - 1]
  if (lastNear !== undefined && lastNear < total - 1) pages.push(null)
  pages.push(total)
  return pages
}
