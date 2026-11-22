# Releasing

`@newt-js/core`, `@newt-js/lint`, `@newt-js/client`, `@newt-js/react`, `@newt-js/cli` and `create-newt` are
published together, at one version: the cli writes backends that depend on newt with `^` on its own version,
which on 0.x takes the patches of that minor alone (`^0.1.0` is below 0.2.0).

Before the first release, check on npm that the scope `@newt-js` and the name `create-newt` are
yours to publish to, and that your npm account has 2FA on: `bun publish` asks for its code.
`create-newt` 0.0.1 is on npm already, published to keep the name: the first release goes above
it, 0.1.0 or more.

```sh
git switch main && git pull                       # a clean main, up to date
bunx npm login                                    # once, on the machine that publishes
bun run release:version 0.1.0                     # every package at 0.1.0, and bun.lock
bun run release:publish                           # every check, check-packs, and each package packed
git add packages/*/package.json bun.lock
git commit -m "release: 0.1.0"
bun run release:publish --publish                 # publishes them, the ones others depend on first
git tag v0.1.0
git push origin main v0.1.0
```

`release:version` refuses a version that is not above the current one, one npm has for any of the
packages, and a tree with changes.
`release:publish --publish` refuses 0.0.0, a tree with changes, a branch other than main, and a
version published already.

If a publish stops halfway, run `bun run release:publish --publish` again: the packages it
published are left as they are, and the rest are published.

A prerelease (`0.2.0-rc.1`) is published with the tag `next`, never as `latest`.

`bun run check-packs` packs each package as npm gets it, makes a backend from them with
`create-newt`, gives it a context, a module, a use case and an app (`newt add app`, on `@newt-js/client` and
`@newt-js/react`), and runs its typecheck, tests and lint. CI runs it on every push to `main` and every pull request.
