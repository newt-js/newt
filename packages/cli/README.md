# @newt-js/cli

newt's command line. It writes code as newt's lint wants it, for people and for agents:
every command takes flags, asks only in a terminal, prints `--json` and changes nothing
with `--dry-run`. Run again, it never overwrites what is there.

```sh
bun create newt my-app        # or: bunx @newt-js/cli init my-app
cd my-app && bun install
bunx newt add context sales
bunx newt add module sales/orders/order
bunx newt --help
```

`bunx newt` runs the project's cli once `bun install` has run in it; before that, or outside a
project, use `bunx @newt-js/cli`: npm's `newt` is another package.
