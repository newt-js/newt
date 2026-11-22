import { join }             from 'node:path'
// --------------------------------------------------------
import type { ModuleNames } from '../../names/module-names/module-names'

/** A field of a module's schema: its name and its zod, as written there (`z.string().trim().min(1)`). */
export type SchemaField = { name: string, zod: string }

/** What an app can take from a module's schema: its fields, and those its create takes; null when newt cannot read it. */
export type SchemaFields = { fields: SchemaField[], create: string[] | null }

const FIELD = /^\s+(\w+):\s*(.+?),?\s*$/

/** The lines between `<head>{` and the `})` that closes it, or null. */
function block(text: string, head: RegExp): string[] | null {
  const start = head.exec(text)
  if (!start) return null
  const end = text.indexOf('\n})', start.index)
  return end === -1 ? null : text.slice(start.index + start[0].length, end).split('\n')
}

/** The fields of `<Type>Schema = z.object({ … })` that sit one per line, and the names `<Type>CreateSchema` picks. */
export function schemaFieldsOf(text: string, type: string): SchemaFields | null {
  const lines = block(text, new RegExp(`export const ${type}Schema = z\\.object\\(\\{`))
  if (lines === null) return null
  const fields = lines.flatMap(line => {
    const found = FIELD.exec(line)
    return found ? [{ name: found[1]!, zod: found[2]! }] : []
  })
  const picked = new RegExp(`export const ${type}CreateSchema\\s*=\\s*${type}Schema\\.pick\\(\\{([^}]*)\\}\\)`).exec(text)
  const create = picked ? [...picked[1]!.matchAll(/(\w+)\s*:\s*true/g)].map(each => each[1]!) : null
  return { fields, create }
}

/** The fields of a module's `<module>.schema.ts`, or null when it has none newt can read. */
export async function schemaFields(folder: string, module: ModuleNames): Promise<SchemaFields | null> {
  const file = Bun.file(join(folder, `${module.folder}.schema.ts`))
  return await file.exists() ? schemaFieldsOf(await file.text(), module.type) : null
}
