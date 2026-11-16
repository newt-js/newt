import type { EntitySchema } from '../../entity-schema'
import { keepsUnnamed }      from '../keeps-unnamed/keeps-unnamed'
import { unnamedTimestamp }  from '../unnamed-timestamp/unnamed-timestamp'

const checked = new WeakMap<EntitySchema, WeakMap<EntitySchema, string[] | undefined>>()

export function checkEntitySchema(entityClass: { name: string }, schema: EntitySchema, publicSchema?: EntitySchema): string[] | undefined {
  const shown = publicSchema ?? schema
  const known = checked.get(schema)
  if (known?.has(shown)) {
    return known.get(shown)
  }
  const entity = entityClass.name
  const unnamed = unnamedTimestamp(schema)
  if (unnamed) {
    throw new Error(`${entity}'s schema does not name ${unnamed}: newt stamps it on every entity, and one read back would lose it. Add ${unnamed}: z.string() to it`)
  }
  if (keepsUnnamed(schema)) {
    throw new Error(`${entity}'s schema keeps fields it does not name (z.looseObject, .catchall, .passthrough): a row's other columns would end up in the entity. Make it a z.object, which drops them, or a z.strictObject`)
  }
  let publicFields: string[] | undefined
  if (publicSchema && publicSchema !== schema) {
    publicFields = Object.keys(publicSchema.shape)
    const unknown = publicFields.find(field => !Object.hasOwn(schema.shape, field))
    if (unknown) {
      throw new Error(`${entity}'s public schema has '${unknown}', which its schema does not: it shows some of its fields, never others`)
    }
  }
  checked.set(schema, (known ?? new WeakMap()).set(shown, publicFields))
  return publicFields
}
