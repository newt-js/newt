# Modeling a module

Start with `newt add module <context>/<module>` ([cli](cli.md)), then shape what it wrote. Examples come from
`src/contexts/auth/modules/`.

## Files and names

A module is a folder `modules/<module>/` with only these files: `<m>.module.ts` (use cases), `<m>.ts` (entity),
`<m>.schema.ts` (DTOs), `<m>.repository.ts`, `<m>.routes.ts`, `<m>.workers.ts`, `<m>.deps.ts`, `<m>-options.ts`,
tests, and the folders `events/`, `errors/`, `value-objects/`, `services/` (lint `module-files`).
Why: anyone who opens a module knows where everything is.

- One entity per module, in `<m>.ts` (lint `module-entity`). A second entity is a module of its own:
  credentials are not inside `user`, they are `userCredential`.
- The folder is kebab-case (`user-credential`), the module camelCase (`super('userCredential', …)`, lint
  `module-names`), the class `UserCredential_Module`, the table snake_case (`user_credential`).
- Events are `<module>.<event>` (`'userCredential.created'`), in `events/<module>-<event>.ts`.
- Modules that belong together share a prefix (`oauth-signing-key`); newt gives the prefix no meaning.

## The schema is the contract

`<m>.schema.ts` imports only zod, `@newt-js/core`, its own value objects and other modules' schema types
(lint `schema-imports`). Why: callers depend on it; how the module works stays out of it.

- `XSchema` is what the entity keeps. Input DTOs derive from it with `pick`/`partial` and are `z.input`;
  the entity's DTO is `z.infer`:

  ```ts
  // application.schema.ts
  export const ApplicationCreateSchema = ApplicationSchema.pick({ slug: true, name: true }).partial({ slug: true })
  export type ApplicationCreateDTO = z.input<typeof ApplicationCreateSchema>
  ```

- **A secret never leaves the module.** A schema with one (a hash, a secret) has `XPublicSchema` without it,
  given to the entity as the 4th constructor argument; `toDTO()` and the created event use it.

  ```ts
  // user-credential.schema.ts
  export const UserCredentialPublicSchema = UserCredentialSchema.omit({ secretHash: true })
  // user-credential.ts
  super(UserCredentialSchema, input, isNew, UserCredentialPublicSchema)
  // events/user-credential-created.ts
  export const UserCredential_Created = defineEvent('userCredential.created', UserCredentialPublicSchema)
  ```

  The entity reads the secret through a getter of its own (`get secretHash()`), for its module only.

## Value objects

- **An enum is always a value object**, never a loose `z.enum` in a schema. Its values are named, so code says
  `UserCredentialKind.password`, not `'password'`:

  ```ts
  // value-objects/user-credential-kind.ts
  export const UserCredentialKind = defineValueObject(
    z.enum(['password']),
    text => new InvalidUserCredentialKind(text),
    { password: 'password' as const },
  )
  export type UserCredentialKind = z.output<typeof UserCredentialKind.schema>
  ```

  `application.schema.ts` still has `registration: z.enum(['closed'])`, from before this rule: do not copy it.
- Ids are `uuidFactory('UserId')`. The id a module keeps of another module's entity is a value object of its own:
  `user/value-objects/application-id.ts` repeats `uuidFactory('ApplicationId')`. Why: another module's
  `value-objects/` are private (lint `module-imports`).
- `newt add value-object` writes the error it throws and its test.

## The entity

- A private constructor `(input, isNew)`, `static fromDTO(row)` to read it back, and static factories that make
  it new (`Application.create(props)`, `UserCredential.password(props)`).
- Its methods take `<Entity><Verb>Props` declared beside it, never a DTO nor an inline object
  (lint `entity-method-params`): `UserCreateProps`, `UserCredentialPasswordProps`. Why: the entity speaks its own
  words; the DTO is the use case's contract.
- It changes through `this.change({...})` in a method with a domain name (`changeSecret`), and tells what happened
  with `this.trackEvent(new X_Created(...))` in that method or factory.
- An entity that references another is given the whole entity, not its id: see [reading](reading.md#references).

## Errors and events

- `newt add error <ctx>/<m> <name> --kind conflict` (validation, unauthorized, forbidden, not-found, conflict):
  the kind is the HTTP status. Its `code` is `<module>.<snake_name>` (`'application.slug_taken'`).
- Another module may import your errors and tell them apart with `instanceof`.
- An event's payload carries ids, not resolved entities, and never a secret. `User_Created` is built from
  `user.data` (the application by its id); `UserCredential_Created` from the public schema.
- List the module's events in `eventsOf(base.bus, { created: User_Created })`: other modules subscribe there.

## Use cases

- Every public method of `<m>.module.ts` is `@UseCase()`; the rest are `private` (lint `use-case-public-methods`).
- Inputs: an object is a DTO of the schema, parsed on the first line with its schema (lint `use-case-params`);
  a single attribute, as an id, is a plain `string`, parsed inside:

  ```ts
  async create(input: ApplicationCreateDTO): Promise<ApplicationDTO> {
    const { slug, name } = ApplicationCreateSchema.parse(input)
  async get(id: string): Promise<UserDTO> {
    const [user] = await this.repository.find({ id: UserId.from(id) }, { limit: 1 })
  ```

- It returns DTOs (`toDTO()`), with other entities resolved ([reading](reading.md)).
- It writes through `this.repository.persist(entity)`, never a transaction of its own (lint `module-transactions`).
- Keep a case's rule in its use case, not in a generic piece: scoping an email to an application belongs to the
  sign-in use case, not to `UserFilter` (a `required` field added there was removed).
- Logic several use cases share goes in `services/` (`newt add service`); a single expression stays inline.
