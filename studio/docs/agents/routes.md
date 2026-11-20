# Routes and sign-in

## Routes

- A module's routes are in `<m>.routes.ts`, registered by `register<M>Routes(router, module)` from its
  constructor. Add one with `newt add route <ctx>/<m> <use-case> --method … --path …`.
- A route only translates HTTP: it hands the body to a use case as it came, and the use case parses it.

  ```ts
  // application.routes.ts
  router.post('/applications', async request => {
    const created = await applications.create(await bodyOf(request))
    return Response.json(created, { status: 201 })
  })
  router.get('/applications/:id', async request => {
    return Response.json(await applications.get(request.params.id))
  })
  ```

  Never `await request.json() as X` (lint `route-body-unchecked`): it says the body is checked when nothing did.
- A path is its module's name in plural: a module is a resource. `signInAttempt` serves `/sign-in-attempts` and
  `/sign-in-attempts/:id/steps`, not `/sign-in`. A path that does not match means the module's name or the path's
  is wrong. `/setup` (`user`) and `/setup/password` (`userCredential`) are from before this rule: do not copy them.
- Pages come from the query with `pageRequestFrom(request)`.
- Paths do not repeat the context: the router already serves `/auth/api`, so write `/users`, not `/auth/users`
  (lint `route-context`).
- A route takes a rate limit defined on `base.rateLimits`; over it, it answers 429 with `Retry-After`. Its counters
  live in the cluster, not the database.

  ```ts
  // sign-in-attempt.routes.ts
  const tries = rateLimits.define('signInAttempt.tries', { limit: 20, windowMs: 60_000 })
  const rateLimit = { limit: tries, by: 'ip' as const }
  ```

- An error thrown by a use case answers with its kind's status (not-found 404, conflict 409…): no try/catch.
- A module only other modules call has no routes: `userCredential` registers none but the setup's
  `/setup/password`, and a test checks `/user-credentials` answers 404.

## Sign-in

- Every route needs a session, else 401. `{ public: true }` as the route's last argument opens it:
  `/setup` and `/setup/password` are public, since nobody can sign in before the first admin exists.
- Each context reads its own session in `<ctx>/authenticate.ts`, given to its router with
  `router.authenticateWith(authenticate)`; it returns `{ userId }` or `null`. `auth` reads its `session_auth` cookie
  through `signInSession.actorOf` (`auth/authenticate.ts`); `panel` and `backoffice` still return `null`.
- A context never accepts another context's session. Other contexts sign in through `auth` over OAuth; see
  [auth-context](auth-context.md).
