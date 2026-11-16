import type { DatabaseKind } from '../../stores/store-databases'

const MIGRATIONS_TEST = `- \`src/migrations.test.ts\`: every context's migrations on a real server. Set \`TEST_DATABASE_URL\`
  (a server where it may create and drop databases) to run it; without it the test is skipped.
`

export const agentsMd = (database: DatabaseKind) => `# Agents

A backend built with newt (@newt-js/core), on Bun.

## Layout

- \`src/index.ts\`: starts the backend on \`PORT\` (from \`.env\`).
- \`src/backend.ts\`: opens the contexts and serves them, with \`GET /api/health\`.
- \`src/stores.ts\`: the database and the files each context opens. Tests start the backend with
  \`startBackend(0, { stores: 'memory' })\`: databases, files and cluster in memory, sqlite with its migrations.
- \`src/env.ts\`: \`requiredEnv\`, for the variables the backend cannot start without.
- \`src/contexts.ts\`: the list of contexts the backend opens.
${database === 'postgres' || database === 'mysql' ? MIGRATIONS_TEST : ''}- \`src/contexts/<context>/\`: one folder per bounded context, its modules in \`modules/<module>/\`, their routes under \`/api/<context>/\`.

## Rules

newt's lint holds the rules of the code: run it after every change and fix what it says.

## Commands

- \`bun run dev\`: the backend, restarted on every change.
- \`bun run test\`, \`bun run typecheck\`, \`bun run lint\`: tests, types and newt's lint. All three must pass.
- \`bunx newt --help\`: what newt's command line can add to this backend. Before \`bun install\`, \`bunx @newt-js/cli --help\`: npm's \`newt\` is another package.
- \`--dry-run\` says what a command would change, writing nothing. \`--json\` prints
  \`{ dryRun, files: [{ path, status, note? }], warnings, nextSteps }\`, or \`{ error }\` with exit code 1;
  paths are from where it runs.
`
