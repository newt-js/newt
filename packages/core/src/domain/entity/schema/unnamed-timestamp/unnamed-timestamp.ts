import type { EntitySchema } from '../../entity-schema'
import { TIMESTAMP_FIELDS }  from '../framework-fields'

export function unnamedTimestamp(schema: EntitySchema): string | undefined {
  return TIMESTAMP_FIELDS.find(field => !Object.hasOwn(schema.shape, field))
}
