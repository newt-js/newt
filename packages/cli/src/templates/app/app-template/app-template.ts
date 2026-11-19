import { join }                  from 'node:path'
// --------------------------------------------------------
import type { FileChange }       from '../../../commands/command'
import type { ContextNames }     from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }       from '../../../project/backend-contexts/backend-contexts'
import { CONTEXT_TO_RUN }        from '../../context/files/context-ts'
import { quoted }                from '../../quoted/quoted'
import type { TemplateVersions } from '../../template-versions/template-versions'
import { APP_TSCONFIG_JSON }     from '../files/app-files'
import { MAIN_TSX }              from '../files/app-files'
import { appTsx }                from '../files/app-files'
import { baseTs }                from '../files/app-files'
import { indexHtml }             from '../files/app-files'
import { appTest }               from '../files/backend-files'
import { contextToRunWithApp }   from '../files/backend-files'

export type AppTemplateOptions = { backend: string, context: ContextNames, versions: TemplateVersions }

export type BuiltAppOptions = { backend: string, context: ContextNames, fromContext: string, fromSrc: string }

/** What makes the context serve its app at /<context>: the app given in <ctx>.context.ts, and a test that it answers. */
function servedAt(backend: string, context: ContextNames, app: string, imports: string[], built?: string): FileChange[] {
  const file = join(backend, CONTEXTS_FOLDER, context.folder, `${context.folder}.context.ts`)
  return [
    { action: 'replace-line', path: file, line: CONTEXT_TO_RUN, with: contextToRunWithApp(app), imports },
    { action: 'append-block', path: join(backend, 'src/index.test.ts'), block: appTest(context, built), imports: built === undefined ? [] : ["import { join } from 'node:path'"] },
  ]
}

/** An app built elsewhere, its folder `fromContext` (from the context's folder), served as it is at /<context>. */
export function builtAppTemplate({ backend, context, fromContext, fromSrc }: BuiltAppOptions): FileChange[] {
  return servedAt(backend, context, `join(import.meta.dir, ${quoted(fromContext)})`, [], quoted(fromSrc))
}

/** A React app of a context, in its app/, with its own tsconfig, served at /<context>. */
export function appTemplate({ backend, context, versions }: AppTemplateOptions): FileChange[] {
  const at = (path: string) => join(backend, path)
  const inContext = `${CONTEXTS_FOLDER}/${context.folder}/app`
  const app = at(inContext)
  return [
    { action: 'create', path: join(app, 'index.html'), content: indexHtml(context) },
    { action: 'create', path: join(app, 'main.tsx'), content: MAIN_TSX },
    { action: 'create', path: join(app, 'app.tsx'), content: appTsx(context) },
    { action: 'create', path: join(app, 'base.ts'), content: baseTs(context) },
    { action: 'create', path: join(app, 'tsconfig.json'), content: APP_TSCONFIG_JSON },
    {
      action: 'complete-json',
      path: at('package.json'),
      values: {
        dependencies: { 'react': versions.react, 'react-dom': versions.reactDom },
        devDependencies: { '@types/react': versions.reactTypes, '@types/react-dom': versions.reactDomTypes },
      },
    },
    { action: 'complete-json', path: at('tsconfig.json'), values: { exclude: [`${CONTEXTS_FOLDER}/*/app`], references: [{ path: `./${inContext}` }] } },
    ...servedAt(backend, context, 'app', ["import app from './app/index.html'"]),
  ]
}
