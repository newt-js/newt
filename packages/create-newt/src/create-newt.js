#!/usr/bin/env node
// Runs create.ts with Bun, from Node too, as npm create newt does; without Bun, says how to get it.
import { spawnSync }     from 'node:child_process'
import { fileURLToPath } from 'node:url'

const bun = process.versions.bun ? process.execPath : 'bun'
const create = fileURLToPath(new URL('./create.ts', import.meta.url))
// A shim on Windows, bun.cmd, runs through the shell.
const { status, signal, error } = spawnSync(bun, [create, ...process.argv.slice(2)], { stdio: 'inherit', shell: process.platform === 'win32' && !process.versions.bun })
if (error?.code === 'ENOENT') {
  console.error('newt runs on Bun, which is not installed here. Install it, as https://bun.sh says, and run bun create newt <name>')
  process.exit(1)
}
if (error) {
  console.error(`newt could not start Bun: ${error.message}`)
  process.exit(1)
}
if (signal) process.kill(process.pid, signal)
process.exit(status ?? 1)
