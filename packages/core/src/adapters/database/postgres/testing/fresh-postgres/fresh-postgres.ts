import { SQL } from 'bun'

export type FreshDatabase = { url: string, drop(): Promise<void> }

export async function freshPostgres(serverUrl: string): Promise<FreshDatabase> {
  const name = `newt_test_${crypto.randomUUID().replaceAll('-', '')}`
  const admin = new SQL(serverUrl)
  try {
    await admin.unsafe(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.close()
  }
  const url = new URL(serverUrl)
  url.pathname = `/${name}`
  return {
    url: url.href,
    drop: async () => {
      const dropping = new SQL(serverUrl)
      try {
        await dropping.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
      } finally {
        await dropping.close()
      }
    },
  }
}
