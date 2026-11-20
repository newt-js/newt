# Migrations

- Each context has its own `migrations/`, applied when the context opens, by `bun run dev` and by the tests.
- A new module gets its pair from `newt add module`. Any other change to a table is the next pair, by hand:
  `<number>_<module>_up.sql` and `<number>_<module>_down.sql`, five digits, one above the highest in that context
  (`00003_user_credential_up.sql`). The table is the module in snake_case, quoted: `"user_credential"`.
- Columns are the schema's fields in snake_case (`applicationId` → `application_id`), plus `version INTEGER NOT NULL`,
  `created_at` and `updated_at`.
- **Never rewrite a migration that exists**, even one not yet committed: Angel's `bun run dev` may have applied it
  already. newt keeps a checksum of each applied `up` file and refuses to start when one changed
  ("was changed after it was applied"). A change is always a new migration.
- Never name a table `newt_…`: those are newt's (lint `framework-tables`).

## Rows a migration seeds

`00001_application_up.sql` seeds auth's own application with a fixed id
(`01a1f4f7-41e3-755d-adb7-298eb0bc0198`), which the tests repeat as `AUTH`. The code finds it by its slug,
`find({ slug: 'auth' })`.
