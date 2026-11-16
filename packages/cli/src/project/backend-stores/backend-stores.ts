import { join }              from 'node:path'
import { default as ts }     from 'typescript'
// --------------------------------------------------------
import { CommandError }      from '../../commands/command-error/command-error'
import type { DatabaseKind } from '../../templates/stores/store-databases'
import { STORE_DATABASES }   from '../../templates/stores/store-databases'
import type { FilesKind }    from '../../templates/stores/store-files'
import { STORE_FILES }       from '../../templates/stores/store-files'

export type BackendStores = { database: DatabaseKind, files: FilesKind }

type Kinds<K extends string> = Record<K, { className: string, imports: string[] }>

const moduleOf = (line: string) => /from '([^']+)'/.exec(line)?.[1]

/** The names each module of `code` is imported for. */
function importedNames(code: string): Set<string> {
  const source = ts.createSourceFile('stores.ts', code, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const each of bindings.elements) names.add(`${statement.moduleSpecifier.text}#${(each.propertyName ?? each.name).text}`)
  }
  return names
}

/** The kinds of database and files a backend's src/stores.ts imports; null without one newt can read; refuses more than one of either. */
export async function backendStores(backend: string): Promise<BackendStores | null> {
  const file = Bun.file(join(backend, 'src/stores.ts'))
  const imported = importedNames(await file.exists() ? await file.text() : '')
  const found = <K extends string>(kinds: Kinds<K>, what: string) => {
    const all = (Object.keys(kinds) as K[]).filter(kind => kinds[kind].imports.some(line => imported.has(`${moduleOf(line)}#${kinds[kind].className}`)))
    if (all.length > 1) {
      throw new CommandError(`src/stores.ts imports ${all.map(kind => kinds[kind].className).join(' and ')}, and newt cannot tell which ${what} the backend uses: leave it one`)
    }
    return all[0]
  }
  const database = found(STORE_DATABASES, 'database')
  const files = found(STORE_FILES, 'storage')
  return database && files ? { database, files } : null
}
