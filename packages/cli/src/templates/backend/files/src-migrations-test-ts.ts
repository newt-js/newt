import type { DatabaseKind } from '../../stores/store-databases'

const SERVERS = {
  postgres: { className: 'PostgresDatabase', module: 'postgres', name: 'Postgres', create: '`CREATE DATABASE "${name}"`', drop: '`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`' },
  mysql: { className: 'MysqlDatabase', module: 'mysql', name: 'MySQL', create: '`CREATE DATABASE \\`${name}\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin`', drop: '`DROP DATABASE IF EXISTS \\`${name}\\``' },
}

/** src/migrations.test.ts: every context's migrations on a real server, on a database of their own, when TEST_DATABASE_URL names one. */
export function srcMigrationsTestTs(database: DatabaseKind): string | null {
  if (database !== 'postgres' && database !== 'mysql') return null
  const server = SERVERS[database]
  return `import { SQL } from 'bun'
import { test } from 'bun:test'
import { dirname, join } from 'node:path'
import { ${server.className} } from '@newt-js/core/database/${server.module}'

const serverUrl = Bun.env.TEST_DATABASE_URL

async function onDatabaseOfItsOwn(run: (url: string) => Promise<void>): Promise<void> {
  const name = \`test_\${crypto.randomUUID().replaceAll('-', '')}\`
  const admin = new SQL(serverUrl!)
  await admin.unsafe(${server.create})
  try {
    const url = new URL(serverUrl!)
    url.pathname = \`/\${name}\`
    await run(url.href)
  } finally {
    await admin.unsafe(${server.drop})
    await admin.close()
  }
}

test.skipIf(!serverUrl)('every context\\'s migrations run on a real ${server.name}, skipped without TEST_DATABASE_URL', async () => {
  const contexts = join(import.meta.dir, 'contexts')
  const migrations = new Set((await Array.fromAsync(new Bun.Glob('*/migrations/*_up.sql').scan(contexts))).map(path => join(contexts, dirname(path))))
  for (const folder of migrations) {
    await onDatabaseOfItsOwn(async url => {
      const database = await ${server.className}.open({ url, migrations: folder })
      await database.close()
    })
  }
}, 60_000)
`
}
