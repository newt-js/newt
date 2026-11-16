# Releasing

`@newt-js/core`, `@newt-js/lint`, `@newt-js/cli` and `create-newt` are published together, at one
version: the cli writes backends that depend on newt at its own version.

```sh
bun tools/release/version.ts 0.1.0      # every package at 0.1.0, and bun.lock
git commit -am "release: 0.1.0"
bun tools/release/publish.ts            # every check, check-packs, and a dry run of each publish
bunx npm login                          # once, on the machine that publishes
bun tools/release/publish.ts --publish  # publishes them, the ones others depend on first
git tag v0.1.0 && git push --tags
```

A prerelease (`0.2.0-rc.1`) is published with the tag `next`, never as `latest`.

`bun run check-packs` packs each package as npm gets it, makes a backend from them with
`create-newt` and runs its typecheck, tests and lint. CI runs it on every push.
