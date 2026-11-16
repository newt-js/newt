import { join }                   from 'node:path'
// --------------------------------------------------------
import type { FileChange }        from '../../../commands/command'
import type { ContextNames }      from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }        from '../../../project/backend-contexts/backend-contexts'
import type { TemplateVersions }  from '../../template-versions/template-versions'
import { FRONTENDS_START }        from '../files/backend-files'
import { SERVED }                 from '../files/backend-files'
import { SERVED_WITH_FRONTENDS }  from '../files/backend-files'
import { SRC_FRONTENDS_TEST_TS }  from '../files/backend-files'
import { SRC_FRONTENDS_TS }       from '../files/backend-files'
import { FRONTEND_TSCONFIG_JSON } from '../files/frontend-files'
import { MAIN_TSX }               from '../files/frontend-files'
import { appTsx }                 from '../files/frontend-files'
import { indexHtml }              from '../files/frontend-files'

export type FrontendTemplateOptions = { backend: string, context: ContextNames, versions: TemplateVersions }

export type BuiltFrontendOptions = { backend: string, context: ContextNames, fromSrc: string }

/** What makes the backend serve a frontend at /<context>: its line in src/frontends.ts, and serve() given them. */
function servedAt(backend: string, context: ContextNames, mount: string, imports: string[]): FileChange[] {
  const at = (path: string) => join(backend, path)
  return [
    { action: 'create', path: at('src/frontends.ts'), content: SRC_FRONTENDS_TS },
    { action: 'create', path: at('src/frontends.test.ts'), content: SRC_FRONTENDS_TEST_TS },
    { action: 'insert-lines', path: at('src/frontends.ts'), anchor: FRONTENDS_START, position: 'after', lines: [`  { path: '/${context.folder}', app: ${mount} },`], imports },
    { action: 'replace-line', path: at('src/backend.ts'), line: SERVED, with: SERVED_WITH_FRONTENDS, imports: ["import { frontends } from './frontends'"] },
  ]
}

/** A frontend built elsewhere, its folder `fromSrc` (from the backend's src/), served as it is at /<context>. */
export function builtFrontendTemplate({ backend, context, fromSrc }: BuiltFrontendOptions): FileChange[] {
  return servedAt(backend, context, `join(import.meta.dir, '${fromSrc}')`, ["import { join } from 'node:path'"])
}

/** A React frontend of a context, in its frontend/, with its own tsconfig, served by the backend at /<context>. */
export function frontendTemplate({ backend, context, versions }: FrontendTemplateOptions): FileChange[] {
  const at = (path: string) => join(backend, path)
  const inContext = `${CONTEXTS_FOLDER}/${context.folder}/frontend`
  const frontend = at(inContext)
  return [
    { action: 'create', path: join(frontend, 'index.html'), content: indexHtml(context) },
    { action: 'create', path: join(frontend, 'main.tsx'), content: MAIN_TSX },
    { action: 'create', path: join(frontend, 'app.tsx'), content: appTsx(context) },
    { action: 'create', path: join(frontend, 'tsconfig.json'), content: FRONTEND_TSCONFIG_JSON },
    {
      action: 'complete-json',
      path: at('package.json'),
      values: {
        dependencies: { 'react': versions.react, 'react-dom': versions.reactDom },
        devDependencies: { '@types/react': versions.reactTypes, '@types/react-dom': versions.reactDomTypes },
      },
    },
    { action: 'complete-json', path: at('tsconfig.json'), values: { exclude: [`${CONTEXTS_FOLDER}/*/frontend`], references: [{ path: `./${inContext}` }] } },
    ...servedAt(backend, context, `${context.camel}Frontend`, [`import ${context.camel}Frontend from './contexts/${context.folder}/frontend/index.html'`]),
  ]
}
