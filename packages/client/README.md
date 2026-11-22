# @newt-js/client

What a frontend of a newt application thinks with, whatever renders it:

- `Store`: a service's state, in one signal; `select` hands out a read-only part of it. And the signals
  themselves (`signal`, `computed`, `effect`, `batch`).
- `Injector` and `inject`: a service is a class built without arguments, which asks for the services it needs
  with `inject(Other)`. The root injector (`rootInjector`) holds one instance of each for the whole app; a child
  injector creates only what it provides, and `dispose` releases it (a service with a `dispose()` cleans up there).
- `Requester`: what every API client extends. It says its `path` and its requests (`this.get`, `this.post`…), and
  gets JSON in and out, query params and a failed answer turned into an `ApiError` (`status`, `message`, `code`;
  status 0 is no answer). `Requester.baseUrl` is the context's API, set when the app starts;
  `onUnauthorized` and `onForbidden` hear every 401 and 403.
- `EventBus`: how features hear what another changed without sharing its state. Events are named as the
  backend's (`client.updated`: the module, a dot, what happened) and carry JSON; one feature `emit`s, those that
  show it listen with `on` (stopping in their `dispose`) and load again. The server's events, in real time, come in
  through `receive`, and reach the same listeners.

It never imports a UI framework: `@newt-js/react` brings it to React.
