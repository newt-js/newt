import { describe }                 from 'bun:test'
import { expect }                   from 'bun:test'
import { test }                     from 'bun:test'
// --------------------------------------------------------
import { IdempotencyAnswerNotKept } from '../errors/idempotency-answer-not-kept/idempotency-answer-not-kept'
import type { KeptAnswer }          from '../kept-answer'
import { replay }                   from './replay'

function answer(status: number, headers: [string, string][], body: 'base64' | 'not kept', bytes = ''): KeptAnswer {
  return { id: 'k', version: 2, bodyHash: 'h', status, headers: JSON.stringify({ headers, body }), body: bytes, expiresAt: '2026-01-01T00:00:00.000Z' }
}

describe('replay', () => {
  test('gives the kept answer again, its kept headers and that it is replayed', async () => {
    const replayed = replay(answer(201, [['content-type', 'text/plain'], ['set-cookie', 'session=ana']], 'base64', new TextEncoder().encode('made').toBase64()))

    expect(replayed.status).toBe(201)
    expect(await replayed.text()).toBe('made')
    expect(replayed.headers.get('content-type')).toBe('text/plain')
    expect(replayed.headers.get('set-cookie')).toBeNull()
    expect(replayed.headers.get('idempotent-replayed')).toBe('true')
  })

  test('a status that has no body is given none', () => {
    expect(replay(answer(204, [], 'base64')).body).toBeNull()
  })

  test('an answer whose body was not kept cannot be given again', () => {
    expect(() => replay(answer(200, [], 'not kept'))).toThrow(IdempotencyAnswerNotKept)
  })
})
