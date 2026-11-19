import { MAX_IN }            from '../../criteria/filter/max-in'
import { ReferenceNotFound } from '../../errors/reference-not-found/reference-not-found'

/**
 * What a `T` references, written as a plain type: under each `<name>Id` field it keeps, the DTO of the entity that
 * id names; under a list it holds (an order's `lines`), what each of its items references.
 *
 * ```ts
 * type OrderReferences = { customerId: CustomerDTO, lines: { productId: ProductDTO } }
 * ```
 */
export type References = { readonly [field: string]: { id: string } | References }

/** A `T` with each referenced `<name>Id` replaced by the entity it names, `<name>`: `null` only where the id may be missing. */
export type Resolved<T, S> = Flat<Omit<T, keyof S> & {
  -readonly [K in keyof S & keyof T as K extends `${infer Name}Id` ? Name : K]: K extends `${string}Id`
    ? S[K] | Missing<T[K]>
    : NonNullable<T[K]> extends readonly (infer Item)[] ? Resolved<Item, S[K]>[] | Extract<T[K], null | undefined> : never
}>

/**
 * How the entities of `S` load: for each `<name>Id`, a function that takes up to 100 distinct ids, typed as the
 * entity's own (`CustomerId`), and gives their entities: the other module's `find({ field: 'id', op: 'in', value: ids })`.
 */
export type Loads<S> = {
  readonly [K in keyof S]: K extends `${string}Id` ? (ids: IdOf<S[K]>[]) => Promise<readonly S[K][]> : Loads<S[K]>
}

type IdOf<R> = R extends { id: infer Id } ? Id : string

/** The loads a `T` may be given: a function under each `<name>Id` that keeps a string id, and loads under each list of objects. */
export type LoadsOf<T> = {
  readonly [K in keyof T as ReferenceField<T, K>]?: K extends `${string}Id`
    ? (ids: NonNullable<T[K]>[]) => Promise<readonly { id: string }[]>
    : LoadsOf<NonNullable<T[K]> extends readonly (infer Item)[] ? Item : never>
}

/** The references some loads give: the entity each load gives, under its field. */
export type LoadedBy<L> = {
  -readonly [K in keyof L]: L[K] extends (ids: never) => Promise<readonly (infer R)[]> ? R : LoadedBy<L[K]>
}

type ReferenceField<T, K extends keyof T> = K extends 'id'
  ? never
  : K extends `${string}Id`
    ? T[K] extends string | null | undefined ? K : never
    : NonNullable<T[K]> extends readonly object[] ? K : never

type Missing<V> = [Extract<V, null | undefined>] extends [never] ? never : null
type Flat<T> = { [K in keyof T]: T[K] } & {}

type Load = (ids: string[]) => Promise<readonly { id: string }[]>
type Entities = Map<string, { id: string }>

/**
 * Replaces, in every item and in the lists it holds, each referenced `<name>Id` with the entity it names, under
 * `<name>`. Each reference loads once for the whole list, inner lists included: its distinct ids, 100 at a time,
 * every reference at once. A `null` or absent id gives `null`; an id that names nothing throws `ReferenceNotFound`.
 */
export async function resolveReference<T extends object, L extends LoadsOf<T> & Record<Exclude<keyof L, keyof LoadsOf<T>>, never>>(
  items: readonly T[],
  loads: L,
): Promise<Resolved<T, LoadedBy<L>>[]> {
  const wanted = new Map<Load, Set<string>>()
  collect(items, loads, wanted)
  const loaded = new Map(await Promise.all([...wanted].map(async ([load, ids]) => [load, await loadAll([...ids], load)] as const)))
  return build(items, loads, loaded) as Resolved<T, LoadedBy<L>>[]
}

function collect(items: readonly object[], loads: object, wanted: Map<Load, Set<string>>): void {
  for (const [field, each] of Object.entries(loads) as [string, Load | object][]) {
    if (typeof each === 'function') {
      const ids = wanted.get(each as Load) ?? new Set<string>()
      wanted.set(each as Load, ids)
      items.map(item => idOf(item, field)).forEach(id => id === null || ids.add(id))
    } else {
      collect(items.flatMap(item => listOf(item, field)), each, wanted)
    }
  }
}

function build(items: readonly object[], loads: object, loaded: Map<Load, Entities>): object[] {
  return items.map(item => {
    const resolved = { ...item } as Record<string, unknown>
    for (const [field, each] of Object.entries(loads) as [string, Load | object][]) {
      if (typeof each === 'function') {
        const id = idOf(item, field)
        const name = field.slice(0, -'Id'.length)
        delete resolved[field]
        resolved[name] = id === null ? null : found(loaded.get(each as Load)!, name, id)
      } else if (Array.isArray(resolved[field])) {
        resolved[field] = build(resolved[field] as object[], each, loaded)
      }
    }
    return resolved
  })
}

async function loadAll(ids: string[], load: Load): Promise<Entities> {
  const chunks: string[][] = []
  for (let at = 0; at < ids.length; at += MAX_IN) {
    chunks.push(ids.slice(at, at + MAX_IN))
  }
  const pages = await Promise.all(chunks.map(chunk => load(chunk)))
  return new Map(pages.flat().map(entity => [entity.id, entity]))
}

function found(entities: Entities, name: string, id: string): { id: string } {
  const entity = entities.get(id)
  if (!entity) {
    throw new ReferenceNotFound(name, id)
  }
  return entity
}

function idOf(item: object, field: string): string | null {
  return ((item as Record<string, unknown>)[field] as string | null | undefined) ?? null
}

function listOf(item: object, field: string): object[] {
  const list = (item as Record<string, unknown>)[field]
  return Array.isArray(list) ? list as object[] : []
}
