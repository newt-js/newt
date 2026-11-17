import type { ContextNames } from '../../../names/context-names/context-names'

export function indexHtml({ type }: ContextNames): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${type}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`
}

export const MAIN_TSX = `import { createRoot } from 'react-dom/client'
import { App } from './app'

createRoot(document.getElementById('root')!).render(<App />)
`

export function appTsx({ type }: ContextNames): string {
  return `export function App() {
  return <h1>${type}</h1>
}
`
}

export const FRONTEND_TSCONFIG_JSON = `${JSON.stringify({
  compilerOptions: {
    lib: ['ESNext', 'DOM', 'DOM.Iterable'],
    target: 'ESNext',
    module: 'Preserve',
    moduleDetection: 'force',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    types: ['bun'],
    allowImportingTsExtensions: true,
    verbatimModuleSyntax: true,
    composite: true,
    emitDeclarationOnly: true,
    outDir: 'dist',
    strict: true,
    skipLibCheck: true,
    noUncheckedIndexedAccess: true,
  },
  include: ['**/*.ts', '**/*.tsx'],
}, null, 2)}\n`
