import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { z }               from 'zod'
// --------------------------------------------------------
import { captureLines }    from '../../../../application/platform/capture-lines/capture-lines'
import { NoActor }         from '../../../../domain/actor/no-actor/no-actor'
import { InvalidEntity }   from '../../../../domain/entity/errors/invalid-entity/invalid-entity'
import { ConflictError }   from '../../../../domain/errors/conflict-error/conflict-error'
import { KnownError }      from '../../../../domain/errors/known-error/known-error'
import { TooManyRequests } from '../../../../domain/errors/too-many-requests/too-many-requests'
import { toErrorResponse } from './to-error-response'

class SlugTaken extends ConflictError<{ slug: string }> {
  readonly code = 'thing.slug_taken'
}

class Weird extends KnownError {
  readonly kind = 'weird'
  readonly code = 'weird'
}

describe('toErrorResponse', () => {
  test('a known error is the status of its kind, with its message, code and params', async () => {
    const response = toErrorResponse(new SlugTaken('Slug taken', { slug: 'a' }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Slug taken', code: 'thing.slug_taken', params: { slug: 'a' } })
  })

  test('no one acting is a 401', async () => {
    const response = toErrorResponse(new NoActor())

    expect(response.status).toBe(401)
    expect(await response.json()).not.toHaveProperty('params')
  })

  test('one who ran into a rate limit is a 429 that says when to try again, in whole seconds', async () => {
    const response = toErrorResponse(new TooManyRequests('session.signIn', 1500))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('2')
  })

  test('invalid input is a 400 with its issues', async () => {
    const parsed = z.object({ title: z.string() }).safeParse({})

    const response = toErrorResponse(parsed.error)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'validation', issues: [expect.objectContaining({ path: ['title'] })] })
  })

  test('an entity that does not pass its schema is not the client\'s fault: a 500 that tells nothing', async () => {
    const parsed = z.object({ priceCents: z.number().min(0) }).safeParse({ priceCents: -5 })
    const log = captureLines()
    try {
      const response = toErrorResponse(new InvalidEntity('Product', 'p1', parsed.error!))

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Something went wrong', code: 'internal' })
    } finally {
      log.restore()
    }
  })

  test('a known error of a kind with no status is a 500 too', async () => {
    const log = captureLines()
    try {
      expect(toErrorResponse(new Weird('odd')).status).toBe(500)
    } finally {
      log.restore()
    }
  })

  test('anything else is a 500 that tells nothing about the inside, and is logged', async () => {
    const log = captureLines()
    try {
      const response = toErrorResponse(new Error('database file is locked'))

      expect(response.status).toBe(500)
      expect(JSON.stringify(await response.json())).not.toContain('locked')
      expect(log.said('error')).toEqual(['[http] unexpected error'])
    } finally {
      log.restore()
    }
  })
})
