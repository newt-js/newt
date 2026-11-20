# Reading data

## Four reads, the same in every module

`find(criteria, sort?)` the list, `get(id)` one or its `NotFound`, `paginate(criteria, page, sort?)` by pages,
and `search(text, page)` by text, always by pages (lint `use-case-reads`). `newt add module` writes the first three.

## Use the criteria before adding anything

Before a named read use case (`application.auth()`, `user.admins()`) or a new repository method, use `find` with a
filter. Add a use case of your own only when a filter cannot say it. Why: every module reads the same way, and a
use case per question grows the API for nothing.

```ts
// user.module.ts, createFirstAdmin
const [auth] = await this.deps.application.find({ slug: AUTH_SLUG })
// user-credential.module.ts, setFirstAdminPassword
const admins = await this.deps.user.find({ applicationId: user.application.id })
```

Prefer **one `find` with the whole criteria** to several finds chained, or to a loop of finds. Another one is fine
when it is truly needed, but squeeze the criteria first:

```ts
// user-credential.module.ts: every admin's password in one read, not one read per admin
const [withPassword] = await this.repository.find(
  { userId: { in: admins.map(each => UserId.from(each.id)) } },
  { limit: 1 },
)
// application.module.ts: ten candidate slugs at once, not one query per try
const found = await this.repository.find({ slug: { in: tried } })
```

## Filters and criteria

- A module's filter is `defineFilter` in its schema: each field with its value schema and its ops
  (`eq`, `ne`, `in`, `gt`, `gte`, `lt`, `lte`, `ieq`), and the fields it sorts by.
- Callers pass the DTO: `{ slug: 'auth' }` for `eq` fields, or nodes `{ field: 'id', op: 'in', value: ids }`
  grouped with `{ and: [...] }` / `{ or: [...] }`. At most 20 conditions, 3 levels and 100 values in an `in`.
- The value schema normalizes what is typed: `slug: { value: z.string().trim().toLowerCase(), ops: ['eq'] }`
  finds `' AUTH '`.
- Parse the filter only inside the module, with `XFilter.toCriteria(criteria)` and `XFilter.toOrder(sort)`.
- Inside its own module, a use case may give the repository row criteria directly: `{ userId, kind }`,
  `{ slug: { in: tried } }`, with `{ limit: 1 }` when one is enough.
- Keep the filter generic: a rule of one use case (an email is looked up within an application at sign-in) goes in
  that use case, not as a required field of the filter.

## Repositories stay simple

A repository has no public method of its own: `persist`, `find`, `count`, `paginate` and `purge` are all
(lint `repository-public-methods`). It only says how rows become entities (`toEntity`). The row type (`XRow`)
stays in the repository: use cases never see it.

## References

A use case returns other entities resolved, never the ids it keeps (lint `use-case-resolved`): `UserDTO` has
`application: ApplicationDTO`, not `applicationId`. Why: callers get a whole DTO without a second call.

1. The schema declares what each id resolves to:
   `export type UserReferences = { applicationId: ApplicationDTO }` and
   `UserDTO = Resolved<z.infer<typeof UserSchema>, UserReferences>`.
2. The entity takes it as its third type: `Entity<typeof UserSchema, typeof UserSchema, UserReferences>`, and its
   factory is given the entity, not the id: `UserCreateProps = { application: ApplicationDTO, … }`.
3. The repository loads them in one batch through the other module's use case:

   ```ts
   // user.repository.ts
   references: {
     applicationId: ids => application.find({ field: 'id', op: 'in', value: ids }),
   },
   ```

Another module's use case is called once for a batch, never in a loop or a `map` (lint `use-case-batched`):
`find` with every id, then `referenced(found, id, 'customer')` to take each.
