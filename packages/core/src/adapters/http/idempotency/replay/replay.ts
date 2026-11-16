import { IdempotencyAnswerNotKept } from '../errors/idempotency-answer-not-kept/idempotency-answer-not-kept'
import type { KeptAnswer }          from '../kept-answer'
import { keptHeaders }              from '../kept-headers/kept-headers'
import type { Stored }              from '../stored'

export const NO_BODY = new Set([101, 204, 205, 304])

export function replay(answer: KeptAnswer): Response {
  const stored = JSON.parse(answer.headers) as Stored
  if (stored.body === 'not kept') {
    throw new IdempotencyAnswerNotKept(answer.status)
  }
  const body = Uint8Array.fromBase64(answer.body)
  return new Response(NO_BODY.has(answer.status) ? null : body, { status: answer.status, headers: [...keptHeaders(stored.headers), ['idempotent-replayed', 'true']] })
}
