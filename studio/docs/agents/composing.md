# Composing modules and contexts

## A module reaches another only through its API

- Declare the dependency with `newt add deps <ctx>/<module> <other>`: it writes `<m>.deps.ts`
  (`export type User_Deps = { application: Application_Module }`) and wires it in the context's `initialize`.
- Call the other module's use cases through `this.deps.<other>`; subscribe to its events through
  `deps.<other>.events.<name>`.
- From another module import only **types** of its `<m>.module.ts`, `<m>.schema.ts` and `events/`, plus its
  `errors/` as values (lint `module-imports`). Its entity, repository, value objects, schemas as values and
  constants are its own. Why: through them a module would read, build or parse another's data behind its back.
- So a constant cannot be shared: `AUTH_SLUG = 'auth'` is repeated as a `const` in `user.module.ts` and
  `user-credential.module.ts`, and an id value object is repeated in each module that keeps it.
- Modules never use each other in a cycle, even through others (lint and CLI refuse it). `userCredential` uses
  `user`, which uses `application`. Where the module that would close the cycle needs the other, it emits an event
  and the other reacts to it.

## The write rule

A use case writes only its own module. To write another module, emit an event and let a worker of that module
react to it. Each transaction saves one module only. newt checks it at run time (`[write rule]` errors, from
`packages/core/src/domain/use-case/use-case-runner/use-case-runner.ts`); the lint does not see it, so a test that
runs the use case is what catches it.

Why: each module keeps its own invariants and commits on its own; a write that spans modules would fail half-way.

Reading another module (`this.deps.user.get(userId)`) is always fine; calling a use case of another module that
writes is not, outside a worker.

## Events and workers

- An event comes from an entity (`trackEvent`) and is published when `persist` commits.
- A use case runs on an event through `newt add subscription <ctx>/<m> <use-case> --on <module>/<event>`,
  written in `<m>.workers.ts`:

  ```ts
  credentials.on(deps.user.events.created, 'forget', created => [{ id: created.id }])
  ```

  The queue is `<module>.<use case>_on_<event>`; `on` names it, so leave `queue` out (lint `reaction-queue`).
- A payload carries ids and no secret ([modules](modules.md#errors-and-events)).
- **One write per worker.** A worker's first save takes its event as received: a second write, or an email sent after
  it, that fails is never retried. Two writes are two subscriptions; an email goes before the save
  (`user-email-link.module.ts`, `sendAccess`).
- **The exception: the emitter's worker writes the other module.** When the module that should react already is used
  by the one that emits, it cannot subscribe without a cycle. Then a worker of the emitting module calls the other
  module's use case, one write per worker. `userCredential` uses `userEmailLink` and `user`, so on its own
  `setFromEmailLink` its workers call `userEmailLink.markUsed` and `user.verifyEmail` (`user-credential.workers.ts`).
  Only then: when the reacting module can use the emitter, its own worker reacts.

## Contexts

- A context reaches another only through the modules it publishes (`public readonly` fields of its
  `<ctx>.context.ts`, made with `newt publish`), and only if `uses` in `eslint.config.ts` lists it
  (lints `context-imports`, `published-modules`).
- A module that uses another context gets it whole in its deps (`newt add deps panel/<m> backoffice`) and calls
  `this.deps.backoffice.<module>.…`.
- **No context uses `auth`, and `auth` publishes nothing.** The others sign in through OAuth, over HTTP.
  Do not add `auth` to `uses` nor publish its modules to make a lint error go away.
