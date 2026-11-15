import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
import { z }                    from 'zod'
// --------------------------------------------------------
import { captureLines }         from '../../../../application/platform/capture-lines/capture-lines'
import { TooManyRequests }      from '../../../../domain/errors/too-many-requests/too-many-requests'
import { UnauthorizedError }    from '../../../../domain/errors/unauthorized-error/unauthorized-error'
import { ValidationError }      from '../../../../domain/errors/validation-error/validation-error'
import { HttpRouter }           from '../../router/http-router/http-router'
import { MalformedBody }        from '../malformed-body/malformed-body'
import { MethodNotAllowed }     from '../method-not-allowed/method-not-allowed'
import { toOauthErrorResponse } from './to-oauth-error-response'

class CodeUsed extends ValidationError {
  readonly code = 'thing.code_used'
}

class Expired extends UnauthorizedError {
  readonly code = 'thing.expired'
}

describe('toOauthErrorResponse', () => {
  test('a known error becomes the OAuth error it is mapped to, with the status of its kind; one nobody mapped, the fallback', async () => {
    const mapped = toOauthErrorResponse(new CodeUsed('Used'), 'invalid_request', { 'thing.code_used': 'invalid_grant' })

    expect([mapped.status, await mapped.json()]).toEqual([400, { error: 'invalid_grant', error_description: 'Used' }])
    expect(await toOauthErrorResponse(new CodeUsed('Used'), 'invalid_request').json()).toMatchObject({ error: 'invalid_request' })
    expect(toOauthErrorResponse(new Expired('Expired'), 'invalid_request').status).toBe(401)
  })

  test('one who ran into a rate limit says when to try again', async () => {
    const response = toOauthErrorResponse(new TooManyRequests('token.exchange', 30_000), 'invalid_request', { too_many_requests: 'slow_down' })

    expect([response.status, response.headers.get('retry-after')]).toEqual([429, '30'])
    expect(await response.json()).toMatchObject({ error: 'slow_down' })
  })

  test('invalid input, or a body that cannot be read, is the fallback, a 400', async () => {
    const parsed = z.object({ code: z.string('Falta el código') }).safeParse({})
    const unreadable = await new Request('http://app.test', { method: 'POST', body: 'not json' }).json().catch(caught => caught)

    expect(await toOauthErrorResponse(parsed.error, 'invalid_client_metadata').json()).toEqual({ error: 'invalid_client_metadata', error_description: 'Falta el código' })
    expect(toOauthErrorResponse(unreadable, 'invalid_request').status).toBe(400)
    expect(toOauthErrorResponse(new MalformedBody(), 'invalid_request').status).toBe(400)
  })

  test('a method the endpoint does not have is a 405, invalid_request whatever the fallback', async () => {
    const response = toOauthErrorResponse(new MethodNotAllowed('GET', '/oauth/register'), 'invalid_client_metadata')

    expect([response.status, (await response.json() as { error: string }).error]).toEqual([405, 'invalid_request'])
  })

  test('nobody caches an answer about tokens', () => {
    expect(toOauthErrorResponse(new CodeUsed('Used'), 'invalid_request').headers.get('cache-control')).toBe('no-store')
  })

  test('anything else, a TypeError too, is a server_error that tells nothing about the inside', async () => {
    const log = captureLines()
    try {
      const response = toOauthErrorResponse(new Error('database exploded'), 'invalid_request')

      expect([response.status, await response.json()]).toEqual([500, { error: 'server_error', error_description: 'Something went wrong' }])
      expect(toOauthErrorResponse(new TypeError('x is undefined'), 'invalid_request').status).toBe(500)
    } finally {
      log.restore()
    }
  })

  test('as a router\'s onError, its 405s and a broken form are OAuth\'s too', async () => {
    const router = new HttpRouter({ prefix: '', public: true, onError: error => toOauthErrorResponse(error, 'invalid_request') })
    router.post('/oauth/token', async request => Response.json(Object.fromEntries(await request.formData())))
    const call = (init: RequestInit) => router.answer(new Request('http://shop.test/oauth/token', init))!

    expect(await (await call({ method: 'GET' })).json()).toMatchObject({ error: 'invalid_request' })
    const broken = await call({ method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: 'garbage' })
    expect([broken.status, (await broken.json() as { error: string }).error]).toEqual([400, 'invalid_request'])
  })
})
