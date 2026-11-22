# @newt-js/client

What a frontend of a newt application thinks with, whatever renders it:

- `Store`: a service's state, in one signal; `select` hands out a read-only part of it. And the signals
  themselves (`signal`, `computed`, `effect`, `batch`).
- `Injector` and `inject`: a service is a class built without arguments, which asks for the services it needs
  with `inject(Other)`. The root injector (`rootInjector`) holds one instance of each for the whole app; a child
  injector creates only what it provides, and `dispose` releases it (a service with a `dispose()` cleans up there).

It never imports a UI framework: `@newt-js/react` brings it to React.
