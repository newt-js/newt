import { createHash }         from 'node:crypto'
import { z }                  from 'zod'
// --------------------------------------------------------
import { defineValueObject }  from '../define-value-object'
import { InvalidSecretToken } from './invalid-secret-token/invalid-secret-token'

const schema = z.string().regex(/^[A-Za-z0-9_-]{43}$/).brand<'SecretToken'>()

export function secretTokenFactory() {
  return defineValueObject(
    schema,
    () => new InvalidSecretToken(),
    {
      generate(): SecretToken {
        return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url') as SecretToken
      },

      hash(value: SecretToken): string {
        return createHash('sha256').update(value).digest('hex')
      },
    },
  )
}

export type SecretToken = string & z.$brand<'SecretToken'>
export const SecretToken = secretTokenFactory()
