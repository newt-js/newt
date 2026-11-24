---
title: Email
description: How a context sends emails through SMTP, and how your tests read them.
sidebar:
  order: 17
---

A context sends its emails with `base.email`. It exists so your modules can write to someone without caring whether the email goes through a server, to the console or nowhere at all.

## Set it up

SMTP needs `nodemailer`, which newt does not install for you:

```sh
bun add nodemailer
```

Give the context `smtpEmail()`, next to its database and its files:

```ts title="src/contexts/tasks/tasks.context.ts"
import { smtpEmail } from '@newt-js/core/email/smtp'

const { database, storage, email } = await openData('tasks', {
  database: { adapter: sqlite(), migrations: MIGRATIONS_FOLDER },
  files: localFiles(),
  email: smtpEmail(),
  router,
  place,
})
const base = new ContextBase({
  name: 'tasks',
  platform,
  database,
  storage,
  email,
})
```

And say in `.env` which server to use:

```sh title=".env"
SMTP_URL=smtp://user:password@smtp.example.com:587
EMAIL_FROM=Newthub <hello@example.com>
```

| Variable | Meaning |
|---|---|
| `SMTP_URL` | The server: `smtp://` (port 587, usually) or `smtps://` for TLS from the start (port 465). |
| `EMAIL_FROM` | Who the emails are from. |
| `<CONTEXT>_EMAIL_FROM` | Who the emails of one context are from, instead. |

:::tip
A password with `@`, `:`, `/`, `#` or `%` is written encoded in a URL: `p@ss` is `p%40ss`.
:::

## Where emails go

| When | What happens |
|---|---|
| `bun run dev`, with no `SMTP_URL` | They are written to the console, links and all. |
| With `SMTP_URL` | They are sent through the server. |
| In production, with no `SMTP_URL` | The backend does not start, and says what is missing. |
| In tests (`data: 'memory'`) | They are kept in memory. None goes out. |

:::caution
Over `smtp://` the connection must go on over TLS, or nothing is sent, not even the password. Only a server on your own machine is let off. For a server with no TLS on a network you trust, add `?requireTLS=false` to the URL.
:::

## Send one

```ts
await this.base.email.send({
  to: 'ana@example.com',
  subject: 'You have a new task',
  text: 'Write the report, by Friday.',
})
```

| Field | Required | Meaning |
|---|---|---|
| `to` | yes | An address, or several. Each alone, with no name: `ana@example.com`. |
| `subject` | yes | The subject. |
| `text` | yes | The email as plain text. |
| `html` | no | The same as HTML. |
| `replyTo` | no | Where answers go. |

`send` rejects when the server does not take the email, or does not answer in 10 seconds.

## Send it from a job

A server may be down for a moment. Send from a [job](/concepts/jobs-and-workers/), and newt tries again by itself:

```ts title="src/contexts/tasks/modules/reminder/reminder.module.ts"
@UseCase()
async tellAssignee(taskId: string): Promise<void> {
  const task = await this.deps.task.get(taskId)
  const reminder = Reminder.sent({ task })
  await this.base.email.send({
    to: task.assignee.email,
    subject: 'You have a new task',
    text: task.title,
  })
  await this.repository.persist(reminder)
}
```

:::danger[Send first, save last]
A worker's first save marks its event as done. An email sent after it, if it fails, is never tried again.
:::

A job may run twice, so the same email may go out twice. Make that harmless.

## Read them in your tests

A test context keeps its emails:

```ts
await context.settle()

expect(context.email.sent).toMatchObject([
  { to: 'ana@example.com', subject: 'You have a new task' },
])
```

To try a server that fails:

```ts
spyOn(context.email, 'send')
  .mockRejectedValueOnce(new Error('down'))
```

With the whole backend, ask for those of one context:

```ts
import { sentEmails } from '@newt-js/core/application/testing'

const backend = await startBackend(0, { data: 'memory' })
const emails = sentEmails(backend.context('tasks').base)
```
