---
title: What is newt
description: A backend framework for Bun where you still know what your system does, and why.
sidebar:
  order: 1
---

newt is a backend framework for Bun. It gives every backend the same shape, so you can understand a change by its parts instead of reading every line.

## The problem it solves

Code is cheap to write now, by you or by an AI agent. Reading it is not. A pull request of forty files compiles and passes its tests, and you approve it without knowing what it changed in your system.

newt answers with a fixed shape. Every piece of code has one place and one job, and a lint checks that it stays that way. When the shape is the same everywhere, a change reads as "a new use case in the task module, which emits an event" instead of forty files of code.

:::note
The ideas behind this are on the [principles](/principles/) page.
:::

## The shape of a backend

A newt backend is made of a few kinds of pieces, one inside the other:

```txt
backend
└── context        tasks, chat, docs…   (one database each)
    └── module     task, project…
        └── use case   create, completeTask…
```

- **Backend**: the program you run. It serves HTTP and runs the work in the background.
- **Context**: one part of your app, such as tasks or chat. Each context has its own database and its own files.
- **Module**: one kind of thing inside a context, such as a task or a project.
- **Use case**: one thing your app does, such as "create a task" or "complete a task". It is a method of its module.

Everything else hangs from a module. An **entity** holds the rules of one task. A **repository** saves and loads tasks. A **route** turns an HTTP request into a call to a use case, and never touches the database.

See [contexts and modules](/concepts/contexts-and-modules/) and [use cases](/concepts/use-cases/).

## Events, jobs and schedules

Modules talk to each other through **events**: short facts such as `task.completed`. A module that cares about one subscribes to it and runs one of its own use cases.

An event is saved in the same transaction as the change that caused it. It waits in the outbox, the queue of jobs that lives in your database, until a **worker** runs each reaction as a **job**. A job that fails is retried, so a reaction is not lost if the process stops halfway.

A **schedule** runs a use case on a cron, such as "every day at 9:00", through the same kind of job.

See [events and subscriptions](/concepts/events/), [jobs and workers](/concepts/jobs-and-workers/) and [scheduled tasks](/concepts/schedules/).

## One database per context

Each context opens its own database. The task tables live in `tasks`, the chat tables in `chat`. A module never reads another context's tables: it asks through a use case, or listens to its events.

SQLite is the default, and it is fit for production. Postgres and MySQL are supported too. See [database and migrations](/concepts/database/).

:::tip
Start with one context. Add a second one when a part of your app has its own data and its own words, such as chat next to tasks.
:::

## What comes in the box

- **`@newt-js/core`**: the framework. Modules, entities, use cases, events, jobs, schedules, files, HTTP, and adapters for SQLite, Postgres and MySQL.
- **`@newt-js/cli`**: the `newt` command. It creates a project and adds contexts, modules, use cases, routes, events and the rest, each in its place.
- **`@newt-js/lint`**: the ESLint rules that hold the shape. It runs with `bun run lint`, and in your editor through its ESLint extension.

## Next steps

- [Install](/start/installation/) what you need.
- Build [your first project](/start/first-project/).
