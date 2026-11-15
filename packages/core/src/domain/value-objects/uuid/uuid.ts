import { z }                 from 'zod'
// --------------------------------------------------------
import { defineValueObject } from '../define-value-object'
import { InvalidUuid }       from './invalid-uuid/invalid-uuid'
import { uuidV7 }            from './uuid-v7/uuid-v7'

export function uuidFactory<const Name extends string>(name: Name) {
  const schema = z.uuidv7().brand<Name>() as unknown as z.ZodType<Uuid<Name>, string>
  return defineValueObject(schema, () => new InvalidUuid(name), {
    generate: (): Uuid<Name> => uuidV7() as Uuid<Name>,
  })
}

export type Uuid<Name extends string> = string & z.$brand<Name>
export const Uuid = uuidFactory('Uuid')
