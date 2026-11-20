# Agents

A backend built with newt (@newt-js/core), on Bun. This file is the index: read it whole, then open the guide
of your task in `docs/agents/` before writing code. Each guide gives the rule, why, and an example from this code.

## Layout

- `src/index.ts`: the backend, `startBackend`: opens the contexts and serves them, with `GET /health-check`;
  run as `bun src/index.ts`, it starts on `PORT` (from `.env`).
  Tests start it with `startBackend(0, { data: 'memory' })`: databases, files and cluster in memory, sqlite with its migrations.
- `src/contexts/contexts.ts`: the list of contexts the backend opens.
- `src/contexts/<context>/`: one folder per bounded context. Its `<context>.context.ts` opens its own data with
  `openData`, its database (`sqlite()`, `postgres()`…) and its files (`localFiles()`…) as `.env` says, and its `initialize`
  builds its modules, each in `modules/<module>/` with its `<module>.module.ts`; their routes under `/<context>/api/`.
  Modules that belong together share a prefix in their name: `oauth-authorization`, `oauth-signing-key`.
  A context holds each module in a field: `private` by default, `public` once it publishes it (`newt publish`);
  another context reaches only the modules it publishes.
- Contexts today: `auth` (modules `application`, `applicationClient`, `user`, `userCredential`, `userEmailLink`,
  `signInAttempt`, `signInSession`, `oauthSigningKey`, `oauthAuthorization`), `backoffice` (modules `signInAttempt`,
  `signInSession`: it signs in through auth) and `panel` (empty).

## Sign-in

Every route is private: without a session it answers 401, and a route takes `{ public: true }` to need none.
Each context says who is calling in its own `authenticate.ts`, next to its `<context>.context.ts`: contexts sign in
in different ways, and one never accepts another's session. It signs no one in until it is written.
Read a session cookie or a bearer token there and return `{ userId }`, or `null`:
`@newt-js/core/http` has `bearerAuthenticator`, `setSessionCookie` and `clearSessionCookie`.

## Rules

newt's lint holds the rules of the code: run it after every change and fix what it says.
It refuses a comment that turns a rule of newt's off, but for one line that names it and says why after `--`:
make the code pass instead.
Which contexts each context uses is listed in `eslint.config.ts` (`uses`). No context uses `auth`, ever: they sign in
through OAuth, over HTTP. Do not add `auth` to `uses` nor publish its modules to make a lint error go away.
A table changes only through a migration: a change to a module's schema needs the next pair in its context's
`migrations/`, `<number>_<module>_up.sql` and `<number>_<module>_down.sql` (the table is `<module>` in snake_case), the number one above the highest there.
The tests run them.

The rules the lint cannot see, each explained in its guide:

- A use case writes only its own module; another module is written from a worker reacting to an event,
  one write per worker, and one module per transaction. ([composing](docs/agents/composing.md))
- From another module, import only types of its module, schema and events, and its errors: no values, no constants.
  ([composing](docs/agents/composing.md))
- Read with `find` and a filter before adding a read use case or a repository method; one `find` with the whole
  criteria before several. ([reading](docs/agents/reading.md))
- A use case returns other entities resolved, never their ids. ([reading](docs/agents/reading.md))
- A route's path is its module's name in plural (`/sign-in-attempts`). ([routes](docs/agents/routes.md))
- An entity has no getter only to read a field: use `toDTO()`. ([modules](docs/agents/modules.md))
- A guard's key is `<context>.<module>.<name>`: keys are shared by the whole database. ([modules](docs/agents/modules.md))
- An enum is a value object. A schema with a secret has a public schema without it, used by `toDTO` and events.
  ([modules](docs/agents/modules.md))
- Never rewrite a migration that exists: a change is a new migration. ([migrations](docs/agents/migrations.md))
- Lines up to 160 characters. ([style](docs/agents/style.md))

## Guides

| To… | Read |
|---|---|
| run a `newt` command (add module, use case, route, deps, event, subscription, value object, publish…) | [cli](docs/agents/cli.md) |
| model a module: schema, entity, value objects, errors, events, use cases | [modules](docs/agents/modules.md) |
| read data: `find`, filters, criteria, references, repositories | [reading](docs/agents/reading.md) |
| make modules or contexts work together: deps, events, workers, publish | [composing](docs/agents/composing.md) |
| add a route, a public route, or sign-in | [routes](docs/agents/routes.md) |
| change a table | [migrations](docs/agents/migrations.md) |
| write tests | [tests](docs/agents/tests.md) |
| write code Angel can read: naming, comments, line length | [style](docs/agents/style.md) |
| work on the `auth` context | [auth-context](docs/agents/auth-context.md) |

## Commands

- `bun run dev`: the backend, restarted on every change.
- `bun run test`, `bun run typecheck`, `bun run lint`: tests, types and newt's lint. All three must pass.
- `bunx newt --help`: what newt's command line can add to this backend. Before `bun install`, `bunx @newt-js/cli --help`: npm's `newt` is another package.
- `--dry-run` says what a command would change, writing nothing. `--json` prints
  `{ dryRun, files: [{ path, status, note? }], warnings, nextSteps }`, or `{ error }` with exit code 1;
  paths are from where it runs.

## About these docs

`AGENTS.md` and `docs/agents/` are kept by hand for now: `newt init` generated the first `AGENTS.md`, but no newt
command writes or updates them. The `/newt-agents` skill merges Angel's feedback into them; `docs/agents/runs.md`
logs each run. Edit them by hand freely: the skill keeps your edits.
