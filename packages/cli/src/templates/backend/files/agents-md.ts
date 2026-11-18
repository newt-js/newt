import type { DatabaseKind } from '../../stores/store-databases'

const TEST_DATABASE = `- \`src/test-database.ts\`: the database of the modules' tests, in memory; with \`TEST_DATABASE_URL\`
  (a server where they may create and drop databases), a new one there per test, with the context's migrations.
`

const MIGRATIONS_RULE = `A table changes only through a migration: a change to a module's schema needs the next pair in its context's
\`migrations/\`, \`<number>_<feature>__<module>_up.sql\` and \`<number>_<feature>__<module>_down.sql\` (the table is \`<feature>$<module>\`), the number one above the highest there.
`

/** How a schema change reaches its table, and which tests see it. */
const migrationsRule = (database: DatabaseKind) => {
  if (database === 'memory') return ''
  if (database === 'sqlite') return `${MIGRATIONS_RULE}The tests run them.\n`
  return `${MIGRATIONS_RULE}The tests run in memory and miss them, unless \`TEST_DATABASE_URL\` is set.\n`
}

export const agentsMd = (database: DatabaseKind) => `# Agents

A backend built with newt (@newt-js/core), on Bun.

## Layout

- \`src/index.ts\`: starts the backend on \`PORT\` (from \`.env\`).
- \`src/backend.ts\`: opens the contexts and serves them, with \`GET /health-check\`.
- \`src/stores.ts\`: the database and the files each context opens. Tests start the backend with
  \`startBackend(0, { stores: 'memory' })\`: databases, files and cluster in memory, sqlite with its migrations.
- \`src/auth.ts\`: \`authenticate\`, who calls the backend, for every context's router.
- \`src/env.ts\`: \`requiredEnv\`, for the variables the backend cannot start without.
- \`src/contexts.ts\`: the list of contexts the backend opens.
${database === 'postgres' || database === 'mysql' ? TEST_DATABASE : ''}- \`src/contexts/<context>/\`: one folder per bounded context, its features in \`features/<feature>/\`,
  each with its entry point \`<feature>.feature.ts\` and a folder for each of its modules, \`<module>/\`; their routes under \`/<context>/api/<feature>/\`.

## Sign-in

Every route is private: without a session it answers 401, and a route takes \`{ public: true }\` to need none.
\`src/auth.ts\` says who is calling, for every context; it signs no one in until it is written.
Read a session cookie or a bearer token there and return \`{ userId }\`, or \`null\`:
\`@newt-js/core/http\` has \`bearerAuthenticator\`, \`setSessionCookie\` and \`clearSessionCookie\`.

## Rules

newt's lint holds the rules of the code: run it after every change and fix what it says.
${migrationsRule(database)}
## Commands

- \`bun run dev\`: the backend, restarted on every change.
- \`bun run test\`, \`bun run typecheck\`, \`bun run lint\`: tests, types and newt's lint. All three must pass.
- \`bunx newt --help\`: what newt's command line can add to this backend. Before \`bun install\`, \`bunx @newt-js/cli --help\`: npm's \`newt\` is another package.
- \`--dry-run\` says what a command would change, writing nothing. \`--json\` prints
  \`{ dryRun, files: [{ path, status, note? }], warnings, nextSteps }\`, or \`{ error }\` with exit code 1;
  paths are from where it runs.
`
