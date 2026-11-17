import { readdir }       from 'node:fs/promises'
import { join }          from 'node:path'
// --------------------------------------------------------
import { migrationName } from '../migration-name/migration-name'

export type MigrationPair = { version: number, name: string, up: string, down: string }

export async function migrationFiles(folder: string | undefined): Promise<MigrationPair[]> {
  if (!folder) {
    return []
  }
  let names: string[]
  try {
    names = await readdir(folder)
  } catch (error) {
    throw new Error(`The migrations folder '${folder}' cannot be read`, { cause: error })
  }
  const byVersion = new Map<number, Partial<MigrationPair>>()
  for (const fileName of names.sort()) {
    const match = /^(\d{5})_(.+)_(up|down)\.sql$/.exec(fileName)
    if (!match) {
      if (/_(up|down)\.sql$/.test(fileName)) throw new Error(`Migration ${fileName} is not named as one, 00001_name_up.sql: it would never run`)
      continue
    }
    const [, versionText, name, direction] = match as unknown as [string, string, string, 'up' | 'down']
    const version = Number.parseInt(versionText, 10)
    const pair = byVersion.get(version) ?? { version, name }
    if (pair.name !== name) {
      throw new Error(`Migrations ${migrationName(version, pair.name!)} and ${migrationName(version, name)} have the same number`)
    }
    pair[direction] = join(folder, fileName)
    byVersion.set(version, pair)
  }
  return [...byVersion.values()].map(pair => {
    if (!pair.up || !pair.down) {
      throw new Error(`Migration ${migrationName(pair.version!, pair.name!)} is missing its ${pair.up ? 'down' : 'up'} file`)
    }
    return pair as MigrationPair
  }).sort((a, b) => a.version - b.version)
}
