export const AGENTS_MD = `# Agents

A backend built with newt (@newt-js/core), on Bun.

## Layout

- \`src/index.ts\`: starts the backend on \`PORT\` (from \`.env\`).
- \`src/backend.ts\`: opens the contexts and serves them, with \`GET /api/health\`.
- \`src/stores.ts\`: the database and the files each context opens; under \`bun test\`, a Postgres, MySQL or S3 is one in memory.
- \`src/env.ts\`: \`requiredEnv\`, for the variables the backend cannot start without.
- \`src/contexts.ts\`: the list of contexts the backend opens.
- \`src/contexts/<context>/\`: one folder per bounded context, its modules in \`modules/<module>/\`, their routes under \`/api/<context>/\`.

## Rules

newt's lint holds the rules of the code: run it after every change and fix what it says.

## Commands

- \`bun run dev\`: the backend, restarted on every change.
- \`bun run test\`, \`bun run typecheck\`, \`bun run lint\`: tests, types and newt's lint. All three must pass.
- \`bunx newt --help\`: what newt's command line can add to this backend. Before \`bun install\`, \`bunx @newt-js/cli --help\`: npm's \`newt\` is another package.
`
