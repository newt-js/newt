import type { ContextNames } from '../../../names/context-names/context-names'

export function indexHtml({ type }: ContextNames): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${type}</title>
    <link rel="stylesheet" href="./app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`
}

/** newt's theme, and where Tailwind finds the app's own class names (its components/). */
export const APP_CSS = `@import "@newt-js/react/theme.css";
@source "./";
`

export const MAIN_TSX = `import { Requester }  from '@newt-js/client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// --------------------------------------------------------
import { App }        from './app'
import { API }        from './base'

Requester.baseUrl = API

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`

export const APP_TSX = `import { Home } from './features/home/home'

export function App() {
  return <Home />
}
`

export function homeTsx({ type }: ContextNames): string {
  return `import { Column }    from '@newt-js/react'
import { Container } from '@newt-js/react'
import { Heading }   from '@newt-js/react'
import { Text }      from '@newt-js/react'

export function Home() {
  return (
    <Container>
      <Column padding={8} gap={2}>
        <Heading>${type}</Heading>
        <Text tone="muted">How this app is built: docs/agents/frontend.md.</Text>
      </Column>
    </Container>
  )
}
`
}

/** Bun's bundler builds the contexts' apps with Tailwind, as the backend serves them. */
export const BUNFIG_LINES = ['[serve.static]', 'plugins = ["bun-plugin-tailwind"]']

/** Where the backend serves the app, and its API: what its client router and its fetches start with. */
export function baseTs({ folder }: ContextNames): string {
  return `const PATH = '/${folder}'

const atPath = location.pathname === PATH
const underPath = location.pathname.startsWith(\`\${PATH}/\`)

export const BASE = atPath || underPath ? PATH : ''
export const API = \`\${BASE}/api\`
`
}

export const APP_TSCONFIG_JSON = `${JSON.stringify({
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
    rootDir: '..',
    outDir: 'dist',
    strict: true,
    skipLibCheck: true,
    noUncheckedIndexedAccess: true,
  },
  include: ['**/*.ts', '**/*.tsx', '../modules/*/*.schema.ts', '../modules/*/value-objects/*.ts', '../modules/*/errors/*.ts'],
}, null, 2)}\n`
