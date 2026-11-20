# Style

Angel reads every line as a reviewer: write for that reader first.

- Lines up to 160 characters (lint `@stylistic/max-len`; imports, URLs and regular expressions may run longer).
  Do not break lines to fit 80: that was tried and wasted time.
- Imports, then exports; packages, then local files, split by `// ----…`; one name per line, sorted and aligned at
  `from` (lint `imports-and-exports`, fixed by `bun run lint --fix`).
- Braces on every `if` and loop, each body on its own lines; a blank line inside a class at each end.
- Comments: one or two short lines saying what it does, as `/** A hash no password matches: … */`. No essays.
- Name conditions: pull a condition into a `const` that reads well (`const given = slug !== undefined`).
- Use domain words for private helpers (`freeSlugFor`, `isTaken`), not storage jargon.
- No overloads that change the return type: one use case per result shape.
- Do not wrap something trivial in a function: a lazy `hashOfNoPassword()` became
  `const NO_PASSWORD = Bun.password.hash(crypto.randomUUID())`.
- Code, comments, names and docs in English.
