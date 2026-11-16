#!/usr/bin/env bun
import { COMMANDS }    from '@newt-js/cli'
import { run }         from '@newt-js/cli'
import { terminalAsk } from '@newt-js/cli'

const result = await run(['init', ...Bun.argv.slice(2)], { commands: COMMANDS, cwd: process.cwd(), ask: process.stdin.isTTY ? terminalAsk : null })
const { code, json } = result
// Who came here has no newt yet: init's messages name this command instead
const text = code === 0 ? result.text : result.text.replaceAll('newt init', 'bun create newt')
if (code === 0 || json) console.log(text)
else console.error(text)
process.exit(code)
