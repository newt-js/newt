# The auth context

`auth` is an OAuth 2.1 + OpenID Connect provider built as a newt context, here before it becomes a package.
Its source of truth is Angel's `~/repos/auth.md` (outside this repo): read it before designing anything of `auth`,
and point out what contradicts it (its §14 lists the red flags). If you cannot read it, ask.

## Decided, and how the code holds it

- **Applications** are isolated worlds of identities (a realm). `auth` has its own, seeded by
  `00001_application_up.sql` with slug `auth` and registration `closed`.
- An application's slug is optional: without one it is made from the name (`Gestión Fincas` → `gestion-fincas`),
  and a taken one gets `-2`, `-3`… (`ApplicationSlug.fromName`, `freeSlugFor`). A slug that is given is kept as given,
  and a taken one throws `SlugTaken` (409).
- **A user belongs to one application**: the same email in two applications is two users.
- Sign-in is not tied to the email: the user's `email` is identity data and may be `null` (a phone, a provider that
  gives none). How a user proves who it is lives in another module, `userCredential`, with a `kind`, so other ways
  (passkeys, Entra ID, Facebook…) fit later. There is no `password` field on the user.
- Secrets are kept only as hashes (`Bun.password`), and never leave the module ([modules](modules.md#the-schema-is-the-contract)).
- The **setup** creates the first admin, WordPress style, through two public routes while `auth` has none:
  `POST /setup` (`user.createFirstAdmin`) and `POST /setup/password` (`userCredential.setFirstAdminPassword`).
  Both answer 409 (`SetupClosed`) once it is done.
- **Sign-in** goes by steps: `POST /sign-in-attempts` starts an attempt with the steps of the policy (today the
  password) and `POST /sign-in-attempts/:id/steps` answers them. An unknown email gets an attempt too, and a wrong
  password and an unknown email answer the same `WrongCredentials`.
- An attempt lasts 10 minutes and locks after 5 wrong answers; a user locks for 15 minutes after 10 wrong answers
  across its attempts, answered as a wrong password so the lock never tells the email exists (`sign-in-attempt.module.ts`).
- A completed attempt opens one session, `POST /sign-in-sessions`: 8 hours, its token in an HttpOnly cookie
  `session_<application slug>`, kept only as a SHA-256 hash. `DELETE /sign-in-sessions/current` signs out.
- Nothing outside `auth` uses it: other contexts sign in through OAuth, over HTTP ([composing](composing.md#contexts)).
