import { join }             from 'node:path'
// --------------------------------------------------------
import type { ModuleNames } from '../../names/module-names/module-names'

const kebab = (camel: string) => camel.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)

/** The plural a module was added with, as its routes file names its module (`registerPersonRoutes(router: HttpRouter, people: Person_Module)`); undefined when it does not. */
export async function writtenPlural(folder: string, { folder: module, type }: ModuleNames): Promise<string | undefined> {
  const file = Bun.file(join(folder, `${module}.routes.ts`))
  if (!await file.exists()) return undefined
  const found = new RegExp(`register${type}Routes\\(\\s*\\w+\\s*:\\s*HttpRouter\\s*,\\s*([a-z]\\w*)\\s*:\\s*${type}_Module`).exec(await file.text())
  return found ? kebab(found[1]!) : undefined
}
