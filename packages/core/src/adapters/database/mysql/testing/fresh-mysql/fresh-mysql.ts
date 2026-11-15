import { SQL } from 'bun'

export type FreshDatabase = { url: string, drop(): Promise<void> }

export async function freshMysql(serverUrl: string): Promise<FreshDatabase> {
  const name = `newt_test_${crypto.randomUUID().replaceAll('-', '')}`
  const admin = new SQL(serverUrl)
  try {
    await admin.unsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin`)
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
        await dropping.unsafe(`DROP DATABASE IF EXISTS \`${name}\``)
      } finally {
        await dropping.close()
      }
    },
  }
}
