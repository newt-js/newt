export const SRC_INDEX_TS = `import { startBackend } from './backend'

await startBackend(Number(Bun.env.PORT ?? 3000))
`
