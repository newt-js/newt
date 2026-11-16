import { findCurrentActor }     from '../../../../domain/actor/find-current-actor/find-current-actor'
import type { Clock }           from '../../../../domain/clock/clock'
import { DuplicateValue }       from '../../../../domain/errors/duplicate-value/duplicate-value'
import { StaleVersion }         from '../../../../domain/errors/stale-version/stale-version'
import type { Records }         from '../../../../domain/repository/records/records'
import { bodyBeforeRoute }      from '../../body/body-before-route/body-before-route'
import type { HttpRoute }       from '../../router/http-route'
import { bytesUpTo }            from '../bytes-up-to/bytes-up-to'
import { IdempotencyKeyInUse }  from '../errors/idempotency-key-in-use/idempotency-key-in-use'
import { IdempotencyKeyReused } from '../errors/idempotency-key-reused/idempotency-key-reused'
import { isEventStream }        from '../is-event-stream/is-event-stream'
import type { KeptAnswer }      from '../kept-answer'
import { keptHeaders }          from '../kept-headers/kept-headers'
import { NO_BODY }              from '../replay/replay'
import { replay }               from '../replay/replay'
import { sha256 }               from '../sha256/sha256'
import { stillOurs }            from '../still-ours/still-ours'
import type { Stored }          from '../stored'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
const KEPT_BYTES = 1024 * 1024

const purgedAt = new WeakMap<Records<KeptAnswer>, number>()

export type IdempotentOptions = { keys: Records<KeptAnswer>, clock: Clock, ttlMs?: number }

export function idempotent(route: HttpRoute, { keys, clock, ttlMs = DAY }: IdempotentOptions): HttpRoute {
  const time = () => clock.now().getTime()
  const at = (ms: number) => new Date(ms).toISOString()

  return async request => {
    const key = request.headers.get('idempotency-key')
    const actor = findCurrentActor()
    if (!key || !actor) {
      return route(request)
    }
    const id = sha256(JSON.stringify([actor.userId, new URL(request.url).pathname, key]))
    const bodyHash = sha256(await bodyBeforeRoute(request))

    const started = time()
    if (started - (purgedAt.get(keys) ?? 0) >= MINUTE) {
      purgedAt.set(keys, started)
      await keys.deleteMany({ expiresAt: { lte: at(started) } })
    }

    const [found] = await keys.find({ id })
    if (found && Date.parse(found.expiresAt) > started) {
      if (found.bodyHash !== bodyHash) {
        throw new IdempotencyKeyReused()
      }
      if (found.status === 0) {
        throw new IdempotencyKeyInUse()
      }
      return replay(found)
    }
    const taken = { bodyHash, status: 0, headers: '[]', body: '', expiresAt: at(started + Math.min(MINUTE, ttlMs)) }
    try {
      if (found) {
        await keys.update(id, found.version, taken)
      } else {
        await keys.insert({ id, ...taken })
      }
    } catch (error) {
      throw error instanceof StaleVersion || error instanceof DuplicateValue ? new IdempotencyKeyInUse() : error
    }
    const version = found ? found.version + 1 : 1
    const release = () => stillOurs(() => keys.delete(id, version))

    let response: Response
    let read: Awaited<ReturnType<typeof bytesUpTo>>
    try {
      response = await route(request)
      if (response.status >= 500) {
        await release()
        return response
      }
      read = isEventStream(response) ? { whole: response } : await bytesUpTo(response, KEPT_BYTES)
    } catch (error) {
      await release()
      throw error
    }
    const keep = (stored: Stored, body: string) =>
      stillOurs(() => keys.update(id, version, { status: response.status, headers: JSON.stringify(stored), body, expiresAt: at(time() + ttlMs) }))
    const stored = { headers: keptHeaders(response.headers) }
    if ('whole' in read) {
      await keep({ ...stored, body: 'not kept' }, '')
      return read.whole
    }
    await keep({ ...stored, body: 'base64' }, read.bytes.toBase64())
    return new Response(NO_BODY.has(response.status) ? null : read.bytes, { status: response.status, statusText: response.statusText, headers: response.headers })
  }
}
