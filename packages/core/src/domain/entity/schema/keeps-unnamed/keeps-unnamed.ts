import { EntitySchema } from '../../entity-schema'

export function keepsUnnamed(schema: EntitySchema): boolean {
  const catchall = schema.def.catchall
  return catchall !== undefined && catchall._zod.def.type !== 'never'
}
