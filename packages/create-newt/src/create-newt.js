#!/usr/bin/env node
// Runs create.ts with Bun, from Node too, as npm create newt does; without Bun, says how to get it.
import { spawnSync }     from 'node:child_process'
import { fileURLToPath } from 'node:url'

const bun = process.versions.bun ? process.execPath : 'bun'
const create = fileURLToPath(new URL('./create.ts', import.meta.url))
const { status, error } = spawnSync(bun, [create, ...process.argv.slice(2)], { stdio: 'inherit' })
if (error) {
  console.error('newt runs on Bun, which is not installed here. Install it, as https://bun.sh says, and run bun create newt <name>')
  process.exit(1)
}
process.exit(status ?? 1)
