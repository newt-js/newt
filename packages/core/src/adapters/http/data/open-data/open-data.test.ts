import { afterEach }      from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { mkdtempSync }    from 'node:fs'
import { mkdtemp }        from 'node:fs/promises'
import { rm }             from 'node:fs/promises'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { memoryDatabase } from '../../../database/memory/memory-adapter/memory-adapter'
import { MemoryDatabase } from '../../../database/memory/memory-database/memory-database'
import { postgres }       from '../../../database/postgres/postgres-adapter/postgres-adapter'
import { sqlite }         from '../../../database/sqlite/sqlite-adapter/sqlite-adapter'
import { SqliteDatabase } from '../../../database/sqlite/sqlite-database/sqlite-database'
import { localFiles }     from '../../../files/local/local-files/local-files'
import { LocalStorage }   from '../../../files/local/local-storage/local-storage'
import { memoryFiles }    from '../../../files/memory/memory-files/memory-files'
import { MemoryStorage }  from '../../../files/memory/memory-storage/memory-storage'
import { s3Files }        from '../../../files/s3/s3-files/s3-files'
import { HttpRouter }     from '../../router/http-router/http-router'
import { openData }       from './open-data'

/** A context with no migrations yet: an empty folder. */
const MIGRATIONS = mkdtempSync(join(tmpdir(), 'newt-migrations-'))
const VARIABLES = ['SALES_ORDERS_DATABASE', 'SALES_ORDERS_FILES', 'PUBLIC_URL', 'FILES_SECRET', 'SALES_ORDERS_DATABASE_URL']
let folder: string | null = null

afterEach(async () => {
  for (const name of VARIABLES) delete Bun.env[name]
  if (folder) await rm(folder, { recursive: true, force: true })
  folder = null
})

describe('openData', () => {
  test("opens a context's database and its files in memory, for its tests", async () => {
    const router = new HttpRouter({ prefix: '/sales-orders/api' })

    const { database, storage } = await openData('sales-orders', { database: { adapter: sqlite(), migrations: MIGRATIONS }, files: localFiles(), router, place: 'memory' })

    expect(database).toBeInstanceOf(SqliteDatabase)
    expect(storage.private).toBeInstanceOf(MemoryStorage)
    expect(router.match(new Request('http://localhost/sales-orders/api/files/a'))).toBeNull()
  })

  test("opens a context's SQLite file and its folder on disk where its variables say, and serves its files", async () => {
    folder = await mkdtemp(join(tmpdir(), 'newt-open-data-'))
    Object.assign(Bun.env, {
      SALES_ORDERS_DATABASE: join(folder, 'orders.sqlite'),
      SALES_ORDERS_FILES: join(folder, 'files'),
      PUBLIC_URL: 'http://localhost:3000',
      FILES_SECRET: 'x'.repeat(32),
    })
    const router = new HttpRouter({ prefix: '/sales-orders/api' })

    const { database, storage } = await openData('sales-orders', { database: { adapter: sqlite(), migrations: MIGRATIONS }, files: localFiles(), router, place: 'configured' })

    expect(await Bun.file(join(folder, 'orders.sqlite')).exists()).toBe(true)
    expect(storage.private).toBeInstanceOf(LocalStorage)
    expect(router.match(new Request('http://localhost/sales-orders/api/files/a'))).not.toBeNull()
    await database.close()
  })

  test('gives the router the database, for the answers of its idempotent routes', async () => {
    const router = new HttpRouter({ prefix: '/api' })

    await openData('sales', { database: { adapter: memoryDatabase(), migrations: MIGRATIONS }, files: memoryFiles(), router, place: 'configured' })

    expect(() => router.post('/orders', () => new Response(null), { idempotency: true })).not.toThrow()
  })

  test('opens a database on a server, and files in S3, in memory for the tests', async () => {
    const router = new HttpRouter({ prefix: '/api' })

    const { database, storage } = await openData('sales', { database: { adapter: postgres(), migrations: MIGRATIONS }, files: s3Files(), router, place: 'memory' })

    expect(database).toBeInstanceOf(MemoryDatabase)
    expect(storage.private).toBeInstanceOf(MemoryStorage)
  })

  test('says which variable is missing to open what is configured', async () => {
    const router = new HttpRouter({ prefix: '/api' })

    expect(openData('sales-orders', { database: { adapter: postgres(), migrations: MIGRATIONS }, files: memoryFiles(), router, place: 'configured' })).rejects.toThrow('SALES_ORDERS_DATABASE_URL is not set: see .env.example')
  })
})
