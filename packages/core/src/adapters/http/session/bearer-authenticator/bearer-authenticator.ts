import { Actor }         from '../../../../domain/actor/actor'
import { Authenticator } from '../authenticator'

export function bearerAuthenticator(verify: (token: string) => Promise<Actor | null>): Authenticator {
  return async request => {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    return token ? verify(token) : null
  }
}
