---
title: Email
description: Cómo envía emails un contexto por SMTP, y cómo los leen tus tests.
sidebar:
  order: 17
---

Un contexto envía sus emails con `base.email`. Existe para que tus módulos escriban a alguien sin preocuparse de si el email sale por un servidor, va a la consola o no sale.

## Configurarlo

SMTP necesita `nodemailer`, que newt no instala por ti:

```sh
bun add nodemailer
```

Dale al contexto `smtpEmail()`, junto a su base de datos y sus ficheros:

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

Y di en `.env` qué servidor usar:

```sh title=".env"
SMTP_URL=smtp://usuario:clave@smtp.example.com:587
EMAIL_FROM=Newthub <hola@example.com>
```

| Variable | Qué es |
|---|---|
| `SMTP_URL` | El servidor: `smtp://` (normalmente en el puerto 587) o `smtps://` para TLS desde el principio (puerto 465). |
| `EMAIL_FROM` | De quién son los emails. |
| `<CONTEXTO>_EMAIL_FROM` | De quién son los de un contexto, en su lugar. |

:::tip
Una clave con `@`, `:`, `/`, `#` o `%` se escribe codificada en una URL: `p@ss` es `p%40ss`.
:::

## A dónde van los emails

| Cuándo | Qué pasa |
|---|---|
| `bun run dev`, sin `SMTP_URL` | Se escriben en la consola, con sus enlaces. |
| Con `SMTP_URL` | Se envían por el servidor. |
| En producción, sin `SMTP_URL` | El backend no arranca, y dice qué falta. |
| En los tests (`data: 'memory'`) | Se guardan en memoria. No sale ninguno. |

:::caution
Con `smtp://` la conexión tiene que seguir por TLS, o no se envía nada, ni siquiera la clave. Solo se libra un servidor en tu propia máquina. Para un servidor sin TLS en una red de confianza, añade `?requireTLS=false` a la URL.
:::

## Enviar uno

```ts
await this.base.email.send({
  to: 'ana@example.com',
  subject: 'Tienes una tarea nueva',
  text: 'Escribir el informe, para el viernes.',
})
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `to` | sí | Una dirección, o varias. Cada una sola, sin nombre: `ana@example.com`. |
| `from` | no | De quién es, `{ name, address }`. Lo que no pongas es lo de `EMAIL_FROM`. |
| `subject` | sí | El asunto. |
| `text` | sí | El email como texto. |
| `html` | no | Lo mismo en HTML. |
| `replyTo` | no | A dónde van las respuestas. |

`send` falla si el servidor no acepta el email, o si no contesta en 10 segundos.

Para firmar un email con otro nombre, desde la misma dirección:

```ts
await this.base.email.send({
  to: 'ana@example.com',
  from: { name: 'Soporte de Newthub' },
  subject: 'Hemos recibido tu pregunta',
  text: 'Te contestamos hoy.',
})
```

:::caution
Casi todos los servidores solo envían desde direcciones que has verificado con ellos. Cambia `name` con libertad, y `address` con cuidado.
:::

## Envíalo desde un job

Un servidor puede caerse un momento. Envía desde un [job](/es/concepts/jobs-and-workers/), y newt lo reintenta solo:

```ts title="src/contexts/tasks/modules/reminder/reminder.module.ts"
@UseCase()
async tellAssignee(taskId: string): Promise<void> {
  const task = await this.deps.task.get(taskId)
  const reminder = Reminder.sent({ task })
  await this.base.email.send({
    to: task.assignee.email,
    subject: 'Tienes una tarea nueva',
    text: task.title,
  })
  await this.repository.persist(reminder)
}
```

:::danger[Primero envía, guarda al final]
El primer guardado de un worker da por hecho su evento. Un email que se envía después, si falla, no se reintenta nunca.
:::

Un job puede ejecutarse dos veces, así que el mismo email puede salir dos veces. Que no haga daño.

## Léelos en tus tests

Un contexto de test guarda sus emails:

```ts
await context.settle()

expect(context.email.sent).toMatchObject([
  { to: 'ana@example.com', subject: 'Tienes una tarea nueva' },
])
```

Para probar un servidor que falla:

```ts
spyOn(context.email, 'send')
  .mockRejectedValueOnce(new Error('caído'))
```

Con el backend entero, pide los de un contexto:

```ts
import { sentEmails } from '@newt-js/core/application/testing'

const backend = await startBackend(0, { data: 'memory' })
const emails = sentEmails(backend.context('tasks').base)
```
