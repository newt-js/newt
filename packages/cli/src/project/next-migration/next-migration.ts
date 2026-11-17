import { readdir } from 'node:fs/promises'

const NUMBERED = /^(\d{5})_(.+)_(up|down)\.sql$/

/** The number of a table's migration in a folder: the one it has already, or one after the highest there, five digits. */
export async function nextMigration(folder: string, table: string): Promise<string> {
  const files = await readdir(folder).catch(() => [])
  const migrations = files.map(file => NUMBERED.exec(file)).filter(match => match !== null)
  const existing = migrations.find(match => match[2] === table)?.[1]
  return existing ?? String(Math.max(0, ...migrations.map(match => Number(match[1]))) + 1).padStart(5, '0')
}
