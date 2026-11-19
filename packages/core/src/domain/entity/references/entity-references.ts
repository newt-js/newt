type Fields = Record<string, unknown>
type Shape = Readonly<Record<string, unknown>>
type Def = { type: string, innerType?: unknown, element?: unknown, shape?: Shape }

/** The entities an entity references, by the path of the field that keeps their id (`customerId`, `lines.productId`), and by id. */
export type EntityReferences = Map<string, Map<string, { id: string }>>

const WRAPPERS = new Set(['optional', 'nullable', 'default', 'prefault', 'readonly', 'nonoptional', 'catch'])

function defOf(type: unknown): Def {
  return (type as unknown as { _zod: { def: Def } })._zod.def
}

function unwrapped(type: unknown): unknown {
  let current = type
  for (let def = defOf(current); WRAPPERS.has(def.type) && def.innerType; def = defOf(current)) {
    current = def.innerType
  }
  return current
}

/** The shape of each item of a field that holds a list of objects, as an order's `lines`. */
function itemShapeOf(type: unknown): Shape | undefined {
  const list = defOf(unwrapped(type))
  if (list.type !== 'array' || !list.element) return undefined
  const item = defOf(unwrapped(list.element))
  return item.type === 'object' ? item.shape : undefined
}

/** The `<name>Id` fields of a shape that may take the entity they name, `<name>`: those whose `<name>` the shape does not keep. */
function referenceFields(shape: Shape): [field: string, name: string][] {
  return Object.keys(shape)
    .filter(field => field !== 'id' && field.endsWith('Id'))
    .map(field => [field, field.slice(0, -'Id'.length)] as [string, string])
    .filter(([, name]) => name !== '' && !Object.hasOwn(shape, name))
}

/**
 * What an entity keeps of what it is given: each referenced entity, `customer`, becomes its id, `customerId`, and is
 * kept apart in `references`, the field's path registered even when it is `null`. A field given as an id is kept as
 * it comes.
 */
export function keptOf(input: Fields, shape: Shape, references: EntityReferences, path = ''): Fields {
  const kept: Fields = { ...input }
  for (const [field, name] of referenceFields(shape)) {
    if (!Object.hasOwn(kept, name) || Object.hasOwn(kept, field)) continue
    const entity = kept[name] as { id: string } | null | undefined
    delete kept[name]
    const at = `${path}${field}`
    const known = references.get(at) ?? new Map<string, { id: string }>()
    references.set(at, known)
    if (entity === undefined) continue
    kept[field] = entity === null ? null : entity.id
    if (entity !== null) known.set(entity.id, entity)
  }
  for (const [field, type] of Object.entries(shape)) {
    const item = itemShapeOf(type)
    const list = kept[field]
    if (item && Array.isArray(list)) {
      kept[field] = list.map(each => keptOf(each as Fields, item, references, `${path}${field}.`))
    }
  }
  return kept
}

/** What an entity shows: in place of each id whose path it was given entities for, `customerId`, the entity, `customer`. */
export function shownOf(data: Fields, shape: Shape, references: EntityReferences, path = ''): Fields {
  const shown: Fields = { ...data }
  for (const [field, name] of referenceFields(shape)) {
    const known = references.get(`${path}${field}`)
    if (!known) continue
    const id = shown[field] as string | null | undefined
    delete shown[field]
    if (id === null || id === undefined) {
      shown[name] = null
      continue
    }
    const entity = known.get(id)
    if (!entity) {
      throw new Error(`${path}${field} ${id} was never given its entity: an entity takes ${name}, never its id alone`)
    }
    shown[name] = entity
  }
  for (const [field, type] of Object.entries(shape)) {
    const item = itemShapeOf(type)
    const list = shown[field]
    if (item && Array.isArray(list)) {
      shown[field] = list.map(each => shownOf(each as Fields, item, references, `${path}${field}.`))
    }
  }
  return shown
}
