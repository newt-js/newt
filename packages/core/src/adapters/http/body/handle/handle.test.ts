import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { captureLines } from '../../../../application/platform/capture-lines/capture-lines'
import { HttpRequest }  from '../../request/http-request'
import { handle }       from './handle'

const post = (body: RequestInit['body'], headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  new Request('http://app.test/api/things', { method: 'POST', headers, body }) as HttpRequest

const echo = async (request: Request) => Response.json(await request.json())

describe('handle', () => {
  test('gives the route\'s answer', async () => {
    expect(await (await handle(echo)(post('{"a":1}'))).json()).toEqual({ a: 1 })
  })

  test('what the route throws is the answer of onError, or a toErrorResponse', async () => {
    const log = captureLines()
    try {
      const failing = () => {
        throw new Error('boom')
      }

      expect((await handle(failing)(post(''))).status).toBe(500)
      expect((await handle(failing, () => new Response('mine', { status: 418 }))(post(''))).status).toBe(418)
    } finally {
      log.restore()
    }
  })

  test('a body read as JSON that does not say it is JSON is a 415', async () => {
    const response = await handle(echo)(post('{"a":1}', { 'content-type': 'text/plain' }))

    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ code: 'unsupported_media_type' })
  })

  test('a body that cannot be read as JSON or as a form is a 400', async () => {
    const form = async (request: Request) => Response.json((await request.formData()).get('name'))

    expect((await handle(echo)(post('{ not json'))).status).toBe(400)
    expect((await handle(form)(post('--x\r\nbroken', { 'content-type': 'multipart/form-data; boundary=x' }))).status).toBe(400)
  })

  test('a body longer than it may be is a 413, whether its length is told or not', async () => {
    const told = await handle(echo, undefined, 10)(post('{"a":1}', { 'content-type': 'application/json', 'content-length': '500' }))
    const untold = await handle(echo, undefined, 10)(post(new Blob(['{"text":"', 'x'.repeat(50), '"}']).stream()))

    expect([told.status, untold.status]).toEqual([413, 413])
    expect(await told.json()).toMatchObject({ code: 'payload_too_large', params: { maxBytes: 10 } })
  })

  test('a body read twice is the route\'s own mistake: a 500', async () => {
    const log = captureLines()
    try {
      const twice = async (request: Request) => Response.json([await request.text(), await request.text()])

      expect((await handle(twice)(post('hello', {}))).status).toBe(500)
    } finally {
      log.restore()
    }
  })
})
