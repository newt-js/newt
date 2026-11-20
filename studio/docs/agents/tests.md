# Tests

- `bun run test`. Each module has `<m>.module.test.ts`, which `newt add` commands extend; a value object has its own
  test beside it. `src/index.test.ts` checks the backend starts and answers `/health-check`.
- A module test builds the whole context on an in-memory sqlite with the context's real migrations, so tables,
  constraints and seeded rows are the real ones:

  ```ts
  // application.module.test.ts
  const database = await SqliteDatabase.open({ path: ':memory:', migrations: MIGRATIONS })
  context = testContext({ name: 'auth', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
  composed = Auth_Context.initialize(context.base, router)
  applications = composed['application']
  ```

  `afterEach(() => context.close())`. A private module field is reached as `composed['application']`.
- Test through use cases, and through routes with `router.answer(new Request(url, init))`: status codes, 401 when
  not signed in (flip `signedIn`), 404 for an unknown id.
- Events: subscribe on `context.base.bus`, run the use case, then `await context.settle()` before asserting.
- A row another module would create through a use case not yet written may be saved through that module's
  repository (`user.module.test.ts`, `saved`) or inserted into its table (`user-credential.module.test.ts`,
  `savedUser`).
- Errors are asserted by class: `rejects.toThrow(SlugTaken)`, `ZodError` for a DTO that does not parse,
  `DuplicateValue` for a unique constraint.
