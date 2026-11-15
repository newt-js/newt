import { z }                 from 'zod'
// --------------------------------------------------------
import { defineValueObject } from '../define-value-object'
import { InvalidKey }        from './invalid-key/invalid-key'

const KEY = /^[A-Za-z0-9._:-]{1,200}$/

export function keyFactory<const Name extends string>(name: Name, pattern: RegExp = KEY) {
  const schema = z.string().regex(pattern).brand<Name>() as unknown as z.ZodType<Key<Name>, string>
  return defineValueObject(schema, () => new InvalidKey(name))
}

export type Key<Name extends string> = string & z.$brand<Name>
export const Key = keyFactory('Key')
