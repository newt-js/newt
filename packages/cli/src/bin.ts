#!/usr/bin/env bun
import { join }         from 'node:path'
// --------------------------------------------------------
import { terminalAsk }  from './ask/terminal-ask/terminal-ask'
import { COMMANDS }     from './commands/commands'
import { findLocalCli } from './find-local-cli/find-local-cli'
import { run }          from './run/run'

const ALREADY_HANDED_OVER = 'NEWT_CLI_DELEGATED'
const THIS_PACKAGE = join(import.meta.dir, '..')

async function handOverTo(projectCli: string, args: string[]): Promise<number> {
  const child = Bun.spawn([process.execPath, projectCli, ...args], { stdio: ['inherit', 'inherit', 'inherit'], env: { ...process.env, [ALREADY_HANDED_OVER]: '1' } })
  return child.exited
}

const args = Bun.argv.slice(2)
const projectCli = process.env[ALREADY_HANDED_OVER] ? null : await findLocalCli(process.cwd(), THIS_PACKAGE)
if (projectCli) {
  process.exit(await handOverTo(projectCli, args))
}
const { code, text } = await run(args, { commands: COMMANDS, cwd: process.cwd(), ask: process.stdin.isTTY ? terminalAsk : null })
if (code === 0) console.log(text)
else console.error(text)
process.exit(code)
