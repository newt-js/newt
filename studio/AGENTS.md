# Agents

A backend built with newt (@newt-js/core), on Bun.

## Layout

- `src/index.ts`: the backend, `startBackend`: opens the contexts and serves them, with `GET /health-check`;
  run as `bun src/index.ts`, it starts on `PORT` (from `.env`).
  Tests start it with `startBackend(0, { data: 'memory' })`: databases, files and cluster in memory, sqlite with its migrations.
- `src/auth.ts`: `authenticate`, who calls the backend, for every context's router.
- `src/contexts/contexts.ts`: the list of contexts the backend opens.
- `src/contexts/<context>/`: one folder per bounded context. Its `<context>.context.ts` opens its own data with
  `openData`, its database (`sqlite()`, `postgres()`…) and its files (`localFiles()`…) as `.env` says, and its `initialize`
  builds its features. Each feature in `features/<feature>/`: its class `<feature>.feature.ts`, which holds its modules, its `index.ts`,
  the only file the other features import of it, and a folder for each module, `<module>/` with its `<module>.module.ts`; their routes under `/<context>/api/<feature>/`.

## Sign-in

Every route is private: without a session it answers 401, and a route takes `{ public: true }` to need none.
`src/auth.ts` says who is calling, for every context; it signs no one in until it is written.
Read a session cookie or a bearer token there and return `{ userId }`, or `null`:
`@newt-js/core/http` has `bearerAuthenticator`, `setSessionCookie` and `clearSessionCookie`.

## Rules

newt's lint holds the rules of the code: run it after every change and fix what it says.
A table changes only through a migration: a change to a module's schema needs the next pair in its context's
`migrations/`, `<number>_<feature>__<module>_up.sql` and `<number>_<feature>__<module>_down.sql` (the table is `<feature>$<module>`), the number one above the highest there.
The tests run them.

## Commands

- `bun run dev`: the backend, restarted on every change.
- `bun run test`, `bun run typecheck`, `bun run lint`: tests, types and newt's lint. All three must pass.
- `bunx newt --help`: what newt's command line can add to this backend. Before `bun install`, `bunx @newt-js/cli --help`: npm's `newt` is another package.
- `--dry-run` says what a command would change, writing nothing. `--json` prints
  `{ dryRun, files: [{ path, status, note? }], warnings, nextSteps }`, or `{ error }` with exit code 1;
  paths are from where it runs.
