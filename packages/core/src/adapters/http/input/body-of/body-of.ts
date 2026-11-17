import type { Unchecked } from './unchecked'

export async function bodyOf(request: Request): Promise<Unchecked> {
  return await request.json()
}
