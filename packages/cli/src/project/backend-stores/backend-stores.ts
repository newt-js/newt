import { join }              from 'node:path'
import { default as ts }     from 'typescript'
// --------------------------------------------------------
import { CommandError }      from '../../commands/command-error/command-error'
import type { DatabaseKind } from '../../templates/stores/store-databases'
import { STORE_DATABASES }   from '../../templates/stores/store-databases'
import type { FilesKind }    from '../../templates/stores/store-files'
import { STORE_FILES }       from '../../templates/stores/store-files'

export type BackendStores = { database: DatabaseKind | undefined, files: FilesKind | undefined }

type Kinds<K extends string> = Record<K, { className: string, imports: string[] }>

const moduleOf = (line: string) => /from '([^']+)'/.exec(line)?.[1]

/** The names each module of `code` is imported for, as values: an import of a type alone opens nothing. */
function importedNames(code: string): Set<string> {
  const source = ts.createSourceFile('stores.ts', code, ts.ScriptTarget.Latest, true)
  const names = new Set<string>()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings) || statement.importClause.isTypeOnly) continue
    for (const each of bindings.elements.filter(element => !element.isTypeOnly)) names.add(`${statement.moduleSpecifier.text}#${(each.propertyName ?? each.name).text}`)
  }
  return names
}

/** The kinds of database and files a backend's src/stores.ts imports, each apart: undefined when it has none of newt's; refuses more than one of either. */
export async function backendStores(backend: string): Promise<BackendStores> {
  const file = Bun.file(join(backend, 'src/stores.ts'))
  const imported = importedNames(await file.exists() ? await file.text() : '')
  const found = <K extends string>(kinds: Kinds<K>, what: string) => {
    const imports = (Object.keys(kinds) as K[]).filter(kind => kinds[kind].imports.some(line => imported.has(`${moduleOf(line)}#${kinds[kind].className}`)))
    // The one in memory is there for the tests too.
    const all = imports.length > 1 ? imports.filter(kind => kind !== 'memory') : imports
    if (all.length > 1) {
      throw new CommandError(`src/stores.ts imports ${all.map(kind => kinds[kind].className).join(' and ')}, and newt cannot tell which ${what} the backend uses: leave it one`)
    }
    return all[0]
  }
  return { database: found(STORE_DATABASES, 'database'), files: found(STORE_FILES, 'storage') }
}
