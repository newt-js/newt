#!/usr/bin/env bun
import { COMMANDS }    from '@newt-js/cli'
import { run }         from '@newt-js/cli'
import { terminalAsk } from '@newt-js/cli'

const { code, text } = await run(['init', ...Bun.argv.slice(2)], { commands: COMMANDS, cwd: process.cwd(), ask: process.stdin.isTTY ? terminalAsk : null })
if (code === 0) console.log(text)
else console.error(text)
process.exit(code)
