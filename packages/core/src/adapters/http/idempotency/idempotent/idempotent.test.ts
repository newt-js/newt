import { afterEach }        from 'bun:test'
import { beforeEach }       from 'bun:test'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import type { Database }    from '../../../../application/database/database'
import { captureLines }     from '../../../../application/platform/capture-lines/capture-lines'
import type { Clock }       from '../../../../domain/clock/clock'
import { NotFoundError }    from '../../../../domain/errors/not-found-error/not-found-error'
import { MemoryDatabase }   from '../../../database/memory/memory-database/memory-database'
import { MysqlDatabase }    from '../../../database/mysql/mysql-database/mysql-database'
import { freshMysql }       from '../../../database/mysql/testing/fresh-mysql/fresh-mysql'
import { PostgresDatabase } from '../../../database/postgres/postgres-database/postgres-database'
import { freshPostgres }    from '../../../database/postgres/testing/fresh-postgres/fresh-postgres'
import { SqliteDatabase }   from '../../../database/sqlite/sqlite-database/sqlite-database'
import { HttpRouter }       from '../../router/http-router/http-router'
import type { KeptAnswer }  from '../kept-answer'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

class NothingToMake extends NotFoundError {
  readonly code = 'thing.nothing'
}

type Opened = { database: Database, close(): Promise<void> }

const databases: [string, (() => Promise<Opened>) | null][] = [
  ['MemoryDatabase', async () => {
    const database = new MemoryDatabase()
    return { database, close: () => database.close() }
  }],
  ['SqliteDatabase', async () => {
    const database = await SqliteDatabase.open({ path: ':memory:' })
    return { database, close: () => database.close() }
  }],
  ['PostgresDatabase', process.env.POSTGRES_TEST_URL ? async () => {
    const fresh = await freshPostgres(process.env.POSTGRES_TEST_URL!)
    const database = await PostgresDatabase.open({ url: fresh.url })
    return { database, close: async () => {
      await database.close()
      await fresh.drop()
    } }
  } : null],
  ['MysqlDatabase', process.env.MYSQL_TEST_URL ? async () => {
    const fresh = await freshMysql(process.env.MYSQL_TEST_URL!)
    const database = await MysqlDatabase.open({ url: fresh.url })
    return { database, close: async () => {
      await database.close()
      await fresh.drop()
    } }
  } : null],
]

function streamed(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({
    start(controller) {
      for (let at = 0; at < bytes.length; at += 1024) {
        controller.enqueue(bytes.slice(at, at + 1024))
      }
      controller.close()
    },
  })
}

for (const [name, open] of databases) {
  describe.skipIf(!open)(`idempotency, on ${name}`, () => {
    let opened: Opened
    let router: HttpRouter
    let made: number
    let gate: Promise<void> | null
    let time: number
    const clock: Clock = { now: () => new Date(time) }

    beforeEach(async () => {
      opened = await open!()
      made = 0
      gate = null
      time = Date.parse('2026-01-01T00:00:00.000Z')
      router = new HttpRouter({ database: opened.database, clock, idempotency: { ttlMs: HOUR } })
      router.authenticateWith(async request => (request.headers.get('x-user') ? { userId: request.headers.get('x-user')! } : null))
      router.post('/things', async request => {
        const { name: thing } = await request.json() as { name: string }
        if (gate) {
          await gate
        }
        if (thing === 'nothing') {
          throw new NothingToMake('Nothing to make')
        }
        if (thing === 'broken') {
          return new Response('broken', { status: 503 })
        }
        made++
        return Response.json({ number: made, name: thing }, { status: 201, headers: { location: `/api/things/${made}`, 'x-made': String(made) } })
      })
      router.put('/things', async () => Response.json({ number: ++made }))
      router.post('/files', async request => {
        const { size, type } = await request.json() as { size: number, type?: string }
        if (gate) {
          await gate
        }
        made++
        request.cookies.set('session', `secret-${made}`)
        const bytes = new Uint8Array(size).map((_, i) => (i * 7 + made) % 256)
        return new Response(bytes, { headers: { 'content-type': type ?? 'application/octet-stream', 'cache-control': 'private, max-age=60', 'set-cookie': `raw=secret-${made}` } })
      })
      router.post('/breaking', async () => {
        made++
        return new Response(new ReadableStream({ pull: controller => controller.error(new Error('the disk went away')) }))
      })
      router.post('/stream', async request => new Response(await new Response(request.body).text()))
      router.post('/form', async request => Response.json({ name: (await request.formData()).get('name') }))
      router.post('/things/:id', async request => {
        const copy = request.clone()
        return Response.json({ id: request.params.id, copy: await copy.text(), own: await request.text() })
      })
      router.post('/empty', async () => {
        made++
        return new Response(null, { status: 204 })
      })
      router.post('/unread', () => new Response('ok', { status: 201 }), { maxBodyBytes: 2048 })
    })

    afterEach(() => opened.close())

    const keys = () => opened.database.records<KeptAnswer>('newt_idempotency_key')

    const send = (path: string, body: unknown, key: string, headers: Record<string, string> = {}) => router.answer(new Request(`http://shop.test${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user': 'ana', 'idempotency-key': key, ...headers },
      body: body instanceof ReadableStream || typeof body === 'string' ? body : JSON.stringify(body),
    }))!

    const post = (thing: string, key?: string, user = 'ana', method = 'POST') => router.answer(new Request('http://shop.test/api/things', {
      method,
      headers: { 'content-type': 'application/json', 'x-user': user, ...(key ? { 'idempotency-key': key } : {}) },
      body: JSON.stringify({ name: thing }),
    }))!

    const held = () => {
      let open = () => {}
      gate = new Promise(resolve => {
        open = resolve
      })
      return () => open()
    }

    test('a POST sent again with the same key gets the first answer, and does nothing again', async () => {
      const first = await post('Plan', 'key-1')
      expect([first.status, await first.json()]).toEqual([201, { number: 1, name: 'Plan' }])

      const again = await post('Plan', 'key-1')
      expect([again.status, again.headers.get('location'), again.headers.get('idempotent-replayed'), again.headers.get('x-made')]).toEqual([201, '/api/things/1', 'true', null])
      expect(await again.json()).toEqual({ number: 1, name: 'Plan' })
      expect(made).toBe(1)

      expect(await (await post('Plan', 'key-2')).json()).toMatchObject({ number: 2 })
      expect(await (await post('Plan', 'key-1', 'bob')).json()).toMatchObject({ number: 3 })
      expect(await (await post('Plan')).json()).toMatchObject({ number: 4 })
      expect(await (await post('Plan')).json()).toMatchObject({ number: 5 })
    })

    test('only a POST: any other method runs every time', async () => {
      await post('Plan', 'key-1', 'ana', 'PUT')
      await post('Plan', 'key-1', 'ana', 'PUT')

      expect(made).toBe(2)
    })

    test('a key is forgotten once it expires, by the clock it is given', async () => {
      await post('Plan', 'key-1')
      time += HOUR - 1
      expect(await (await post('Plan', 'key-1')).json()).toMatchObject({ number: 1 })
      time += 1
      expect(await (await post('Plan', 'key-1')).json()).toMatchObject({ number: 2 })
      expect(await (await post('Plan', 'key-1')).json()).toMatchObject({ number: 2 })
    })

    test('forgotten keys are removed as new ones come, at most once a minute', async () => {
      await post('Plan', 'key-1')
      time += HOUR - MINUTE / 2
      await post('Plan', 'key-2')
      time += MINUTE / 2
      await post('Plan', 'key-3')
      expect(await keys().count()).toBe(3)
      time += MINUTE / 2
      await post('Plan', 'key-4')
      expect(await keys().count()).toBe(3)
    })

    test('the same key with another body is a 422, and runs nothing', async () => {
      await post('Plan', 'key-1')
      const other = await post('Other', 'key-1')

      expect(other.status).toBe(422)
      expect(await other.json()).toMatchObject({ code: 'idempotency_key_reused' })
      expect(made).toBe(1)
    })

    test('what fails is not kept: the same key tries again', async () => {
      expect((await post('nothing', 'key-1')).status).toBe(404)
      expect((await post('broken', 'key-2')).status).toBe(503)
      expect((await post('Plan', 'key-1')).status).toBe(201)
      expect((await post('Plan', 'key-2')).status).toBe(201)
      expect(made).toBe(2)
    })

    test('the same key while the first is in progress is a 409', async () => {
      const open = held()
      const first = post('Plan', 'key-1')
      await Bun.sleep(30)

      const second = await post('Plan', 'key-1')
      expect(second.status).toBe(409)
      expect(await second.json()).toMatchObject({ code: 'idempotency_key_in_use' })
      open()
      expect((await first).status).toBe(201)
      expect(made).toBe(1)
    })

    test('a key in progress is held a minute at most: a process that died does not hold it for the whole day', async () => {
      const open = held()
      const first = post('Plan', 'key-1')
      await Bun.sleep(30)
      gate = null
      time += MINUTE - 1
      expect((await post('Plan', 'key-1')).status).toBe(409)
      time += 1
      const second = await post('Plan', 'key-1')
      expect([second.status, await second.json()]).toEqual([201, { number: 1, name: 'Plan' }])

      open()
      expect(await (await first).json()).toMatchObject({ number: 2 })
      const again = await post('Plan', 'key-1')
      expect(again.headers.get('idempotent-replayed')).toBe('true')
      expect(await again.json()).toMatchObject({ number: 1 })
    })

    test('an answer is kept byte by byte, and given again as it was; one with no body has none again', async () => {
      const bytes = new Uint8Array(await (await send('/api/files', { size: 300 }, 'key-1')).arrayBuffer())
      const again = await send('/api/files', { size: 300 }, 'key-1')

      expect([again.headers.get('idempotent-replayed'), again.headers.get('content-type'), again.headers.get('cache-control')]).toEqual(['true', 'application/octet-stream', 'private, max-age=60'])
      expect(new Uint8Array(await again.arrayBuffer())).toEqual(bytes)
      expect((await send('/api/empty', {}, 'key-2')).status).toBe(204)
      const empty = await send('/api/empty', {}, 'key-2')
      expect([empty.status, empty.headers.get('idempotent-replayed')]).toEqual([204, 'true'])
      expect(made).toBe(2)
    })

    test('a cookie is never kept, nor given again: it was the first caller\'s alone', async () => {
      const first = await send('/api/files', { size: 3 }, 'key-1')
      expect(first.headers.getSetCookie()).toEqual(['raw=secret-1', expect.stringMatching(/^session=secret-1/)])
      const [row] = await keys().find()
      expect(row!.headers).not.toContain('secret')

      const again = await send('/api/files', { size: 3 }, 'key-1')
      expect([again.headers.get('idempotent-replayed'), again.headers.getSetCookie()]).toEqual(['true', []])
    })

    test('an answer longer than a megabyte, or a stream of events, is done once, not kept: the same key again is a 409', async () => {
      const long = await send('/api/files', { size: 1024 * 1024 + 1 }, 'key-1')
      expect((await long.arrayBuffer()).byteLength).toBe(1024 * 1024 + 1)
      const longAgain = await send('/api/files', { size: 1024 * 1024 + 1 }, 'key-1')
      expect([longAgain.status, (await longAgain.json() as { code: string }).code]).toEqual([409, 'idempotency_answer_not_kept'])

      expect((await (await send('/api/files', { size: 3, type: 'text/event-stream' }, 'key-2')).arrayBuffer()).byteLength).toBe(3)
      expect((await send('/api/files', { size: 3, type: 'text/event-stream' }, 'key-2')).status).toBe(409)
      expect(made).toBe(2)
    })

    test('an answer whose body breaks as it is read is not kept: the same key tries again', async () => {
      const log = captureLines()
      try {
        expect((await send('/api/breaking', {}, 'key-1')).status).toBe(500)
        expect(await keys().count()).toBe(0)
        expect((await send('/api/breaking', {}, 'key-1')).status).toBe(500)
        expect(made).toBe(2)
      } finally {
        log.restore()
      }
    })

    test('the body read to hash it is still the route\'s, as a stream, a form or a copy, with its params', async () => {
      const plain = { 'content-type': 'text/plain' }
      for (const body of [() => 'hello', () => streamed('hello')]) {
        const key = crypto.randomUUID()
        expect(await (await send('/api/stream', body(), key, plain)).text()).toBe('hello')
        expect(await (await send('/api/things/7', body(), key, plain)).json()).toEqual({ id: '7', copy: 'hello', own: 'hello' })
      }
      const form = { 'content-type': 'application/x-www-form-urlencoded' }
      expect(await (await send('/api/form', streamed('name=ana'), 'key-1', form)).json()).toEqual({ name: 'ana' })
      const broken = await send('/api/form', streamed('garbage'), 'key-2', { 'content-type': 'multipart/form-data; boundary=xx' })
      expect([broken.status, (await broken.json() as { code: string }).code]).toEqual([400, 'malformed_body'])
    })

    test('a body sent with no length is held to the route\'s limit, though the route never reads it', async () => {
      expect((await send('/api/unread', streamed('x'.repeat(5000)), 'key-1', { 'content-type': 'text/plain' })).status).toBe(413)
      expect(await keys().count()).toBe(0)
    })
  })
}

describe('idempotency, as routes are registered', () => {
  test('an idempotent POST needs its router\'s database, which keeps the first answers', () => {
    const router = new HttpRouter({ idempotency: true })

    expect(() => router.post('/things', () => new Response())).toThrow('POST /api/things is idempotent: its router needs a database')
    expect(() => router.put('/things', () => new Response())).not.toThrow()
  })

  test('a public route may not be idempotent: its callers are no one, and would get each other\'s answers', () => {
    const database = new MemoryDatabase()
    const router = new HttpRouter({ database, idempotency: true })

    expect(() => router.post('/sign-up', () => new Response(), { public: true })).toThrow('POST /api/sign-up is public and idempotent')
    expect(() => new HttpRouter({ database }).group('/sessions', (_request, next) => next(), { public: true, idempotency: true }).post('', () => new Response())).toThrow('POST /api/sessions is public and idempotent')
    expect(() => router.post('/sign-in', () => new Response(), { public: true, idempotency: false })).not.toThrow()
    expect(() => router.put('/sign-up', () => new Response(), { public: true })).not.toThrow()
  })
})
