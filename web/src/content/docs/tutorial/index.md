---
title: 'Tutorial: building Newthub'
description: Build a team app with newt, one step at a time.
sidebar:
  order: 1
---

In this tutorial you build Newthub, a small app for teams: tasks, projects, documents and chat. Each step adds one part of newt to a backend that runs from the first step.

:::note[Coming soon]
The steps are being written. Until they are out, [your first project](/start/first-project/) takes you from an empty folder to a running backend.
:::

## The steps

1. **Project and first context**: create Newthub and its `tasks` context.
2. **Use cases and entities**: what a task is and what you can do with it.
3. **Database with SQLite**: tables, migrations, filters and pages.
4. **HTTP and routes**: call the use cases from outside.
5. **Projects**: a second module, which tasks belong to.
6. **Events between modules**: react when a task is completed.
7. **Chat**: a second context, with its own database.
8. **Documents**: upload and serve files.
9. **Scheduled tasks**: send reminders every morning.
10. **Testing**: test use cases, routes and events.
11. **Deploying**: run Newthub in production.

## What you need

- Bun 1.4.0 or newer. See [installation](/start/installation/).
- TypeScript basics, and what an HTTP request and a SQL table are.

You do not need to know any architecture pattern. Each step explains the words it uses.
