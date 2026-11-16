import { ReferenceNotFound } from '../../../errors/reference-not-found/reference-not-found'
import type { Ref }          from '../ref'
import type { RefFinder }    from '../ref-finder'
import { resolve }           from '../resolve/resolve'

export function resolveRefs<K extends string>(ids: Record<K, string | null>, finders: Record<K, RefFinder>): Promise<Record<K, Ref | null>>
export function resolveRefs<K extends string>(ids: Partial<Record<K, string | null | undefined>>, finders: Record<K, RefFinder>): Promise<Partial<Record<K, Ref | null>>>
export async function resolveRefs<K extends string>(ids: Partial<Record<K, string | null | undefined>>, finders: Record<K, RefFinder>): Promise<Partial<Record<K, Ref | null>>> {
  const refs: Partial<Record<K, Ref | null>> = {}
  for (const key of Object.keys(ids) as K[]) {
    const id = ids[key]
    if (id === undefined) {
      continue
    }
    refs[key] = id === null
      ? null
      : await resolve(() => finders[key].find({ id: [id] }), () => new ReferenceNotFound(key, id))
  }
  return refs
}
