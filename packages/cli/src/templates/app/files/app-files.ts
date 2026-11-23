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

export const APP_TSX = `import { Router }    from '@newt-js/react'
// --------------------------------------------------------
import { AppRoutes } from './app.routes'
import { BASE }      from './base'

export function App() {
  return (
    <Router basename={BASE}>
      <AppRoutes />
    </Router>
  )
}
`

/** The shell's route around every page, and one lazy route per feature. */
export const APP_ROUTES_TSX = `import { lazy }     from 'react'
import { Route }    from 'react-router'
import { Routes }   from 'react-router'
// --------------------------------------------------------
import { NotFound } from './pages/not-found/not-found'
import { Shell }    from './pages/shell/shell'

const Home = lazy(() => import('./features/home/home').then(({ Home }) => ({ default: Home })))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
`

/** The frame around every page: the place for the navigation, the brand and the user. */
export const SHELL_TSX = `import { Column }   from '@newt-js/react'
import { Suspense } from 'react'
import { Outlet }   from 'react-router'

export function Shell() {
  return (
    <Column as="main">
      <Suspense>
        <Outlet />
      </Suspense>
    </Column>
  )
}
`

export const NOT_FOUND_TSX = `import { Button }    from '@newt-js/react'
import { Column }    from '@newt-js/react'
import { Container } from '@newt-js/react'
import { Heading }   from '@newt-js/react'
import { Text }      from '@newt-js/react'

export function NotFound() {
  return (
    <Container>
      <Column padding={8} gap={4} align="start">
        <Heading>Not found</Heading>
        <Text tone="muted">There is nothing at this address.</Text>
        <Button href="/" variant="outline">Go home</Button>
      </Column>
    </Container>
  )
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
  // A module's index.ts offers its module's type too: the app's program reads its whole module, as types alone.
  include: ['**/*.ts', '**/*.tsx', '../modules/**/*.ts'],
  exclude: ['../modules/**/*.test.ts'],
}, null, 2)}\n`
