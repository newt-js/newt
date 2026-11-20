# Runs of /newt-agents

The `/newt-agents` skill logs each run here, newest first: the commit it read newt at, what it changed and why.
The next run studies only what changed since that commit (`git diff <commit> -- packages studio/src`) and the
new feedback.

## 2026-11-20 · 913f639 (feat/studio-basic-auth-fase-2)

Studied what changed since 46324a6 (the line length to 160 in `packages/lint` and the CLI's texts, the sign-in
modules in `studio/src`) and Angel's feedback.

- Feedback merged: a route's path is its module's plural (`routes`), no entity getter only to read a field
  (`modules`), guard keys as `<context>.<module>.<name>` (`modules`). Each with the code from before the rule.
- Brought up to date with the code: the contexts' modules (`AGENTS.md`), auth's sign-in and rate limits
  (`routes`), sign-in by steps, locks and sessions (`auth-context`), `get` and `deps` in the CLI (`cli`).
- The guard race (agent's idea) and the CLI and core findings went to `~/repos/newt-backlog.md`.

## 2026-11-19 · 46324a6 (feat/studio-basic-auth-fase-2)

First run: studied `packages/core`, `packages/lint` (every rule), `packages/cli` (every command, run in a copy of
studio), all of `studio/src`, `~/repos/auth.md` and Angel's feedback.

- `AGENTS.md` became the index: kept all it said, added the rules the lint cannot see and the table of guides.
- New guides: `cli`, `modules`, `reading`, `composing`, `routes`, `migrations`, `tests`, `style`, `auth-context`.
- Feedback merged: enums as value objects, public schema without secrets, nothing trivial wrapped, use-case rules
  out of generic filters, simple repositories, slug generation, login not tied to email, lines at 120 (the earlier
  80 was superseded), `find` with criteria before named reads, one `find` before several, constants not shared.
- Agent ideas went to `~/repos/newt-backlog.md` as proposals, not rules.
- `CLAUDE.md` (`@AGENTS.md`) deleted, as asked.
