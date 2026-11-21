# The newt CLI

Use the CLI for every piece it can write: it writes what the lint wants, wires it into the module and the context,
and adds a test. Write by hand only what it leaves you (its `nextSteps` and `warnings`).

Run it from `studio/` as `bunx newt …`. Every command takes `--dry-run` (writes nothing) and `--json`
(`{ dryRun, files, warnings, nextSteps }`, or `{ error }` with exit code 1). Run with `--dry-run --json` first when
you are not sure, then without it. `bunx newt <command> --help` has the options.

## By task

| To… | Run | Then, by hand |
|---|---|---|
| add a module (entity, use cases, routes, table, test) | `newt add module auth/session` (`--plural` for an irregular plural) | the schema's fields, the migration's columns (it writes the pair), the use cases you keep |
| add a use case | `newt add use-case auth/user sign-up` | what it does; a change to the entity is a method of the entity, called before `persist` |
| add a route to a use case | `newt add route auth/user sign-up --method post --path /users/sign-up` | nothing, if the use case exists (it refuses otherwise) |
| let a module use another of its context | `newt add deps auth/user-credential user` | call it as `this.deps.user.…` |
| let a module use another context | `newt add deps panel/<module> backoffice` | call `this.deps.backoffice.<module>.…`; never with `auth` |
| add an event | `newt add event auth/user renamed` | emit it from an entity method (`this.trackEvent(…)`), add it to `eventsOf` in `<m>.module.ts` |
| run a use case on an event | `newt add subscription auth/user-credential forget --on user/created` | the args it takes from the event, in `<m>.workers.ts`; its test |
| run a use case on a cron | `newt add schedule auth/user purge --cron "0 3 * * *"` | what the use case does |
| add a value object (enums too) | `newt add value-object auth/user-credential user-credential-kind` | its zod schema; for an enum, see [modules](modules.md) |
| add an error | `newt add error auth/user email-taken --kind conflict` | throw it where it happens |
| add logic use cases share | `newt add service auth/application slugs` | the function; call it from the use cases |
| publish a module to other contexts | `newt publish <context>/<module>` | nothing; never for `auth` |
| add a context | `newt add context <name>` | it imports a shared `src/auth.ts` it writes: give the context its own `<name>/authenticate.ts`, import that, delete `src/auth.ts`;, add `<name>: []` to `uses` in `eslint.config.ts` |
| change a table | none: write the migration pair by hand | see [migrations](migrations.md) |

`--on` names an event as `created` (the module's own), `customer/created` (a module of its context it uses) or
`auth/user/created` (a module another context publishes).

## Things the CLI expects

- Names are kebab-case: `newt add use-case auth/user sign-up` makes `signUp`; `signUp` is refused.
- It edits files only where they look as it wrote them. Keep `initialize` as it writes it,
  `const module = new X_Module(…)` then `return module`: with `return new UserCredential_Module(…)`
  (`user-credential.module.ts`), `newt add subscription` writes nothing and asks you to wire the workers by hand.
- `newt add use-case <ctx>/<m> get` is refused ("get is one of the reads newt's lint shapes"): write
  `get(id: string)` by hand, as in `user.module.ts`.
- `newt add deps` writes nothing for a module that already has deps or whose repository takes them
  (`user-credential`, `sign-in-session`): add the field to `<m>.deps.ts` and the context's `initialize` by hand.
- It refuses a cycle between modules before writing anything: `newt add deps auth/user user-credential` fails,
  since `userCredential` uses `user`.
- `newt publish auth/<module>` would run, but `auth` publishes nothing: no context uses it.
- The CLI still thinks of one `src/auth.ts` for every context: `newt add context` writes it, and `newt add module`
  says "write authenticate in src/auth.ts". Here each context has its own `authenticate.ts` (see [routes](routes.md)).
- A generated use case or test may not fit the module (a test that calls a `create` the module has not):
  read what it wrote, and fix it until `bun run test` passes.
