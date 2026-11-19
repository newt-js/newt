import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { TooManyRequests } from '../../../../domain/errors/too-many-requests/too-many-requests'
import { errorAnswer }     from './error-answer'

describe('errorAnswer', () => {
  test('the body as JSON with its status', async () => {
    const answer = errorAnswer(404, { error: 'Not there', code: 'not_found' }, new Error('x'))

    expect(answer.status).toBe(404)
    expect(await answer.json()).toEqual({ error: 'Not there', code: 'not_found' })
    expect(answer.headers.get('retry-after')).toBeNull()
  })

  test('one who ran into a rate limit is told when to try again', () => {
    const answer = errorAnswer(429, { error: 'Too many', code: 'too_many_requests' }, new TooManyRequests('session.signIn', 3000))

    expect(answer.headers.get('retry-after')).toBe('3')
  })
})
