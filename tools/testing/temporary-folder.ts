// Preloaded by bun test: every temporary folder the tests make goes in one, removed when they end.
import { afterAll }    from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { rmSync }      from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'

const folder = mkdtempSync(join(tmpdir(), 'newt-tests-'))
process.env.TMPDIR = folder

afterAll(() => rmSync(folder, { recursive: true, force: true }))
