import { findCurrentActor }   from '../../../../domain/actor/find-current-actor/find-current-actor'
import { clientIp }           from '../../request/client-ip/client-ip'
import type { HttpRequest }   from '../../request/http-request'
import type { HttpRateLimit } from '../http-rate-limit'

export function whoIs({ by = 'actor' }: HttpRateLimit, request: HttpRequest): string | null {
  if (typeof by === 'function') {
    const key = by(request)
    return key === null ? null : `key:${key}`
  }
  const actor = by === 'actor' ? findCurrentActor() : undefined
  return actor ? `actor:${actor.userId}` : `ip:${clientIp(request) ?? 'unknown'}`
}
