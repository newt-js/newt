# @newt-js/lint

The lint of an application built with newt: every module made of the same files, reaching
others only through what they offer, and writing only through its repository. It keeps
whoever writes the code, a person or an agent, on the same rails.

This is not the lint of the newt repository itself (`tools/lint`), which only keeps the
framework's own style.

## Use

In the application's `eslint.config.ts`:

```ts
import { newt } from '@newt-js/lint'

export default newt({ root: import.meta.dirname, contexts: { folder: 'src/contexts' } })
```

Run it with Bun, which loads the package's TypeScript as it is:

```sh
bun --bun eslint
```

Options:

| Option | Says |
|---|---|
| `root` | The folder of the config, which globs and folders are read from. ESLint's cwd without it. |
| `files` | The globs of the files it lints. Every `.ts` file by default. |
| `contexts` | `{ folder, uses? }`: the folder of the bounded contexts and, optionally, which ones each one uses. Without `uses`, each context's `<name>.context.ts` says it by what it imports. |

Every rule is an `error`: a warning does not stop an agent.

## Rules

### Modules and contexts

| Rule | Checks |
|---|---|
| `newt/module-files` | A module has only its own files, named after it: `.module`, `.ts` (the entity), `.schema`, `.repository`, `.routes`, `.workers`, `.deps`, `-options`, its tests, and the folders `events/`, `errors/`, `value-objects/` and `services/`. |
| `newt/module-entity` | A module keeps one entity, the root of its aggregate: only its `<m>.ts` declares a class that extends `Entity`, and only one, however many base classes of its own it goes through. Another entity is a module of its own, referenced by its id. |
| `newt/frontend-imports` | A context's app (`<context>/app/`, `.ts` and `.tsx`) imports its own files and, as types alone (`import type`), its context's schemas; never the server's code: no module, repository or other context, and newt, Bun and Node (`bun`, `bun:*`, `node:*`) only as types. |
| `newt/module-imports` | A module imports from another only its module, its schema, its events and its errors. |
| `newt/context-imports` | A context imports only the contexts it says it uses, never in a cycle. |
| `newt/schema-imports` | A module's schema imports only zod, `@newt-js/core` (its root), the module's value objects and other modules' schemas. |

### Use cases

| Rule | Checks |
|---|---|
| `newt/use-case-public-methods` | Every public method of a module is a use case, marked `@UseCase`. |
| `newt/use-case-params` | A use case's parameters are value objects or DTOs of its schema, and its input DTOs are parsed with that schema. |
| `newt/use-case-reads` | `find`, `get` and `paginate` read by criteria; `search` reads by text, as `(text, page)`. |
| `newt/use-case-files` | What a module does with its files is done by `uploadStart`, `uploadConfirm` and `downloadUrl`. |

### Entity, repository, routes and reactions

| Rule | Checks |
|---|---|
| `newt/entity-method-params` | An entity takes its own `Props`, never a DTO nor an object written in place. |
| `newt/repository-public-methods` | A repository declares no public method of its own: `persist`, `find`, `count`, `paginate` and `purge` are all it has. |
| `newt/route-context` | No route a context's files register, on its router or a group of it, starts with the context: the router already serves them under `/<context>/api`, so `/shop/orders` would answer at `/shop/api/shop/orders`. Paths are read through consts, templates and a group's prefix; one it cannot read is let be. |
| `newt/route-body-unchecked` | A route passes the body to a use case as it came, never asserting its type. |
| `newt/reaction-queue` | A reaction's queue names the module that reacts, the use case it calls and the event. |
| `newt/module-transactions` | A module never runs a transaction of its own from its base's `transactions`: it writes through its repository's `persist`. A field of its own named `transactions` is no transaction. |
| `newt/framework-tables` | An application never names a table `newt_…`, to `records('…')` or in SQL. |

### The lint's own discipline

| Rule | Checks |
|---|---|
| `newt/no-disable` | No comment turns off a rule of newt's, or one the preset turns on, for a stretch of code, nor changes it. One line may be let off when the comment names the rule and says why after `--`. The preset's processor keeps even `/* eslint-disable */` from turning this rule off. |

### From other plugins

- `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises`.
- `curly` and `brace-style`: braces always, and every body on lines of its own.
- `reportUnusedDisableDirectives: 'error'`.
