import { join }                  from 'node:path'
// --------------------------------------------------------
import type { FileChange }       from '../../../commands/command'
import type { ContextNames }     from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }       from '../../../project/backend-contexts/backend-contexts'
import { contextToRun }          from '../../context/files/context-ts'
import { quoted }                from '../../quoted/quoted'
import type { TemplateVersions } from '../../template-versions/template-versions'
import { appTest }               from '../files/backend-files'
import { contextToRunWithApp }   from '../files/backend-files'
import { APP_TSCONFIG_JSON }     from '../files/frontend-files'
import { MAIN_TSX }              from '../files/frontend-files'
import { appTsx }                from '../files/frontend-files'
import { baseTs }                from '../files/frontend-files'
import { indexHtml }             from '../files/frontend-files'

export type FrontendTemplateOptions = { backend: string, context: ContextNames, versions: TemplateVersions }

export type BuiltFrontendOptions = { backend: string, context: ContextNames, fromContext: string, fromSrc: string }

/** What makes the context serve its app at /<context>: the app given in <ctx>.context.ts, and a test that it answers. */
function servedAt(backend: string, context: ContextNames, app: string, imports: string[], built?: string): FileChange[] {
  const file = join(backend, CONTEXTS_FOLDER, context.folder, `${context.folder}.context.ts`)
  return [
    { action: 'replace-line', path: file, line: contextToRun(context), with: contextToRunWithApp(context, app), imports },
    { action: 'append-block', path: join(backend, 'src/backend.test.ts'), block: appTest(context, built), imports: built === undefined ? [] : ["import { join } from 'node:path'"] },
  ]
}

/** An app built elsewhere, its folder `fromContext` (from the context's folder), served as it is at /<context>. */
export function builtFrontendTemplate({ backend, context, fromContext, fromSrc }: BuiltFrontendOptions): FileChange[] {
  return servedAt(backend, context, `join(import.meta.dir, ${quoted(fromContext)})`, [], quoted(fromSrc))
}

/** A React app of a context, in its app/, with its own tsconfig, served at /<context>. */
export function frontendTemplate({ backend, context, versions }: FrontendTemplateOptions): FileChange[] {
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
