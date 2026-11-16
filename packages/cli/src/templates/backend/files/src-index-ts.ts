export const SRC_INDEX_TS = `import { startBackend } from './backend'

const running = await startBackend(Number(Bun.env.PORT || 3000))
console.log(\`Listening on \${running.server?.url}\`)
`
