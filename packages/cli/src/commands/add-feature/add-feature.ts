import { join }                 from 'node:path'
import { relative }             from 'node:path'
// --------------------------------------------------------
import { contextNames }         from '../../names/context-names/context-names'
import { moduleNames }          from '../../names/module-names/module-names'
import { pieceNames }           from '../../names/piece-names/piece-names'
import { RESERVED_WORDS }       from '../../names/reserved-words/reserved-words'
import { CONTEXTS_FOLDER }      from '../../project/backend-contexts/backend-contexts'
import { backendContexts }      from '../../project/backend-contexts/backend-contexts'
import { findBackend }          from '../../project/find-backend/find-backend'
import { schemaFields }         from '../../project/schema-fields/schema-fields'
import { writtenPlural }        from '../../project/written-plural/written-plural'
import type { FeatureOfModule } from '../../templates/app/files/feature-files'
import { copiedRule }           from '../../templates/app/files/feature-files'
import { featureApiTs }         from '../../templates/app/files/feature-files'
import { featureFormTsx }       from '../../templates/app/files/feature-files'
import { featureListHeadTsx }   from '../../templates/app/files/feature-files'
import { featureListRowTsx }    from '../../templates/app/files/feature-files'
import { featureListTsx }       from '../../templates/app/files/feature-files'
import { featureRouteLines }    from '../../templates/app/files/feature-files'
import { featureServiceTs }     from '../../templates/app/files/feature-files'
import { featureStateTs }       from '../../templates/app/files/feature-files'
import { featureTsx }           from '../../templates/app/files/feature-files'
import type { FileChange }      from '../command'
import { defineCommand }        from '../command'
import { CommandError }         from '../command-error/command-error'

const USAGE = 'newt add feature takes the context and the feature, as in newt add feature sales/clients'

/** Where the routes file of a feature's line goes: before the page for any other address. */
const NOT_FOUND_ROUTE = '<Route path="*" element={<NotFound />} />'

const ROUTES_HEAD = 'export function AppRoutes() {'

/** The module a feature shows, from its schema: its fields but the id, and those its create takes. */
async function boundModule(folder: string, given: string, modules: string[], context: string): Promise<{ bound: FeatureOfModule, warnings: string[] }> {
  if (!modules.includes(given)) {
    throw new CommandError(`The context ${context} has no module ${given}: add it with newt add module ${context}/${given}`)
  }
  const names = moduleNames(given)
  const plural = await writtenPlural(folder, names)
  const module = plural === undefined ? names : moduleNames(given, plural)
  const fields = await schemaFields(folder, module)
  if (fields === null || fields.create === null) {
    throw new CommandError(`newt cannot read the fields of ${given}.schema.ts: it needs ${module.type}Schema = z.object({ … }), one field a line, and ${module.type}CreateSchema = ${module.type}Schema.pick({ … })`)
  }
  const inputs = fields.create.flatMap(name => fields.fields.filter(field => field.name === name))
  const warnings = inputs
    .filter(input => copiedRule(input.zod) !== input.zod)
    .map(input => `${input.name} is not plain text in ${given}.schema.ts (${input.zod}): its form takes it as text; copy its rule into the state file, and give it its control`)
  return { bound: { module, columns: fields.fields.filter(field => field.name !== 'id'), inputs }, warnings }
}

export const ADD_FEATURE = defineCommand({
  name: 'add feature',
  summary: "Adds a feature to a context's app, at its own address; with --module, a list of that module and a form that adds to it",
  args: '<context>/<feature>',
  options: {
    module: { type: 'string', value: 'module', description: 'A module of the context the feature shows: a page of its list, with load more, and a form for its create' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, ...rest] = args
    const [context, name, ...more] = given?.split('/') ?? []
    if (context === undefined || name === undefined || more.length > 0 || rest.length > 0) throw new CommandError(USAGE)
    const feature = pieceNames(name, 'a feature')
    if (RESERVED_WORDS.has(feature.camel)) throw new CommandError(`'${name}' cannot name a feature: JavaScript keeps it; name it by what it shows`)
    const backend = await findBackend(cwd, options.backend)
    const found = (await backendContexts(backend)).find(each => each.name === context)
    if (!found) throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    const contextFolder = join(backend, CONTEXTS_FOLDER, contextNames(context).folder)
    const app = join(contextFolder, 'app')
    const routes = join(app, 'app.routes.tsx')
    if (!await Bun.file(routes).exists()) throw new CommandError(`The context ${context} has no app: add it with newt add app ${context}`)
    const folder = join(app, 'features', feature.folder)
    if (await Bun.file(join(folder, `${feature.folder}.tsx`)).exists()) throw new CommandError(`The app of ${context} has a feature ${name} already`)
    const { bound, warnings } = options.module === undefined
      ? { bound: null, warnings: [] }
      : await boundModule(join(contextFolder, 'modules', options.module), options.module, found.modules, context)
    const file = (suffix: string) => relative(cwd, join(folder, `${feature.folder}${suffix}`))
    // Every part in a folder of its own, inside its parent's: `clients-list/clients-list-row/clients-list-row.tsx`.
    const part = (path: string[]) => {
      const folders = path.map(each => `${feature.folder}-${each}`)
      return relative(cwd, join(folder, ...folders, `${folders.at(-1)}.tsx`))
    }
    const lines = featureRouteLines(feature)
    const changes: FileChange[] = [
      { action: 'create', path: file('.tsx'), content: featureTsx(feature, bound) },
      { action: 'create', path: file('.service.ts'), content: featureServiceTs(feature, bound) },
      { action: 'create', path: file('.api.ts'), content: featureApiTs(feature, bound) },
      ...bound === null ? [] : [
        { action: 'create' as const, path: file('.state.ts'), content: featureStateTs(feature, bound) },
        { action: 'create' as const, path: part(['form']), content: featureFormTsx(feature, bound) },
        { action: 'create' as const, path: part(['list']), content: featureListTsx(feature, bound) },
        { action: 'create' as const, path: part(['list', 'list-head']), content: featureListHeadTsx(feature, bound) },
        { action: 'create' as const, path: part(['list', 'list-row']), content: featureListRowTsx(feature, bound) },
      ],
      { action: 'insert-lines', path: relative(cwd, routes), anchor: ROUTES_HEAD, position: 'before', lines: [lines.lazy, ''], imports: [] },
      { action: 'insert-lines', path: relative(cwd, routes), anchor: NOT_FOUND_ROUTE, position: 'before', lines: [lines.route], imports: [] },
    ]
    return {
      changes,
      warnings,
      nextSteps: [`bun run dev, and open /${context}/${feature.folder}`, 'link it from the shell, pages/shell/shell.tsx, if people reach it from there'],
    }
  },
})
