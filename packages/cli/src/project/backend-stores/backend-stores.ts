import { join }              from 'node:path'
import { default as ts }     from 'typescript'
// --------------------------------------------------------
import { CommandError }      from '../../commands/command-error/command-error'
import type { DatabaseKind } from '../../templates/stores/store-databases'
import { STORE_DATABASES }   from '../../templates/stores/store-databases'
import type { FilesKind }    from '../../templates/stores/store-files'
import { STORE_FILES }       from '../../templates/stores/store-files'
import { CONTEXTS_FOLDER }   from '../backend-contexts/backend-contexts'

export type BackendStores = { database: DatabaseKind | undefined, files: FilesKind | undefined }

type Manifest = { newt?: { database?: unknown, files?: unknown } }

const kindIn = <K extends string>(kinds: Record<K, unknown>, given: unknown): K | undefined => typeof given === 'string' && Object.hasOwn(kinds, given) ? given as K : undefined

/** The kinds of database and files newt add context gives a new context: those of the backend's package.json, `newt`, as newt init wrote them. */
export async function backendStores(backend: string): Promise<BackendStores> {
  const manifest = Bun.file(join(backend, 'package.json'))
  const { newt } = await manifest.exists() ? await manifest.json().catch(() => ({})) as Manifest : {}
  return { database: kindIn(STORE_DATABASES, newt?.database), files: kindIn(STORE_FILES, newt?.files) }
}

/** The names each module of `code` is imported for, as values: an import of a type alone opens nothing. */
function importedNames(code: string): Set<string> {
  const source = ts.createSourceFile('context.ts', code, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings) || statement.importClause.isTypeOnly) continue
    for (const each of bindings.elements.filter(element => !element.isTypeOnly)) names.add(`${statement.moduleSpecifier.text}#${(each.propertyName ?? each.name).text}`)
  }
  return names
}

/** The kind of database a context opens: the adapter of core its <context>.context.ts imports; undefined when it imports none; refuses two. */
export async function contextDatabase(backend: string, context: string): Promise<DatabaseKind | undefined> {
  const path = join(CONTEXTS_FOLDER, context, `${context}.context.ts`)
  const file = Bun.file(join(backend, path))
  const imported = importedNames(await file.exists() ? await file.text() : '')
  const kinds = (Object.keys(STORE_DATABASES) as DatabaseKind[]).filter(kind => imported.has(`${STORE_DATABASES[kind].from}#${STORE_DATABASES[kind].adapter}`))
  if (kinds.length > 1) {
    throw new CommandError(`${path} imports ${kinds.map(kind => `${STORE_DATABASES[kind].adapter}()`).join(' and ')}, and newt cannot tell which database the context opens: leave it one`)
  }
  return kinds[0]
}
