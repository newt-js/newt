import type { DatabaseKind } from '../../stores/store-databases'

const SERVERS = {
  postgres: { className: 'PostgresDatabase', module: 'postgres', create: '`CREATE DATABASE "${name}"`', drop: '`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`' },
  mysql: { className: 'MysqlDatabase', module: 'mysql', create: '`CREATE DATABASE \\`${name}\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin`', drop: '`DROP DATABASE IF EXISTS \\`${name}\\``' },
}

/** src/test-database.ts: a module test's database, in memory, or a new one on TEST_DATABASE_URL's server with the context's migrations. */
export function srcTestDatabaseTs(database: DatabaseKind): string | null {
  if (database !== 'postgres' && database !== 'mysql') return null
  const server = SERVERS[database]
  return `import { SQL } from 'bun'
import type { Database } from '@newt-js/core/application'
import { MemoryDatabase } from '@newt-js/core/database/memory'
import { ${server.className} } from '@newt-js/core/database/${server.module}'

const serverUrl = Bun.env.TEST_DATABASE_URL

type TestDatabase = { database: Database, drop: () => Promise<void> }

export async function testDatabase(migrations: string): Promise<TestDatabase> {
  if (!serverUrl) {
    return { database: new MemoryDatabase(), drop: async () => {} }
  }
  const name = \`test_\${crypto.randomUUID().replaceAll('-', '')}\`
  const admin = new SQL(serverUrl)
  await admin.unsafe(${server.create})
  const url = new URL(serverUrl)
  url.pathname = \`/\${name}\`
  const drop = async () => {
    await admin.unsafe(${server.drop})
    await admin.close()
  }
  try {
    const database = await ${server.className}.open({
      url: url.href,
      migrations,
    })
    return { database, drop }
  } catch (error) {
    await drop()
    throw error
  }
}
`
}
