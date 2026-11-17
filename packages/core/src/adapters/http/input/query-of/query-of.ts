import type { Unchecked } from '../body-of/unchecked'

export function queryOf(request: Request): Unchecked {
  return Object.fromEntries(new URL(request.url).searchParams)
}
