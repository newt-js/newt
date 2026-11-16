import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { applyResult } from './apply-result'

const emptyFolder = () => mkdtempSync(join(tmpdir(), 'newt-cli-apply-'))

const create = (path: string, content = path) => ({ action: 'create' as const, path, content })

describe('applyResult', () => {
  test('creates the files, folders included', async () => {
    const cwd = emptyFolder()
    const report = await applyResult({ changes: [create('a.txt'), create('src/deep/b.txt')] }, cwd, false)
    expect(report.files).toEqual([{ path: 'a.txt', status: 'created' }, { path: 'src/deep/b.txt', status: 'created' }])
    expect(await Bun.file(join(cwd, 'src/deep/b.txt')).text()).toBe('src/deep/b.txt')
  })

  test('never overwrites a file that exists: it skips it', async () => {
    const cwd = emptyFolder()
    await Bun.write(join(cwd, 'a.txt'), 'mine')
    const report = await applyResult({ changes: [create('a.txt', 'theirs')] }, cwd, false)
    expect(report.files).toEqual([{ path: 'a.txt', status: 'skipped', note: 'already exists' }])
    expect(await Bun.file(join(cwd, 'a.txt')).text()).toBe('mine')
  })

  test('a file created twice is created once, and reported once', async () => {
    const cwd = emptyFolder()
    const report = await applyResult({ changes: [create('a.txt', 'first'), create('a.txt', 'second')] }, cwd, false)
    expect(report.files).toEqual([{ path: 'a.txt', status: 'created' }])
    expect(await Bun.file(join(cwd, 'a.txt')).text()).toBe('first')
  })

  test('a dry run reports the same and writes nothing', async () => {
    const cwd = emptyFolder()
    await Bun.write(join(cwd, 'a.txt'), 'mine')
    const changes = [create('a.txt'), create('src/b.txt'), create('src/b.txt')]
    const report = await applyResult({ changes }, cwd, true)
    expect(report).toEqual({
      dryRun: true,
      files: [{ path: 'a.txt', status: 'skipped', note: 'already exists' }, { path: 'src/b.txt', status: 'created' }],
      warnings: [],
      nextSteps: [],
    })
    expect(readdirSync(cwd)).toEqual(['a.txt'])
  })

  test('completes a JSON and ensures lines, saying what each changed and warning of what it left', async () => {
    const cwd = emptyFolder()
    await Bun.write(join(cwd, 'package.json'), '{ "name": "shop", "scripts": { "dev": "bun index.ts" } }')
    const report = await applyResult({ changes: [
      { action: 'complete-json', path: 'package.json', values: { scripts: { dev: 'bun src/index.ts', test: 'bun test' } } },
      { action: 'ensure-lines', path: '.gitignore', lines: ['data'] },
    ] }, cwd, false)
    expect(report.files).toEqual([{ path: 'package.json', status: 'updated' }, { path: '.gitignore', status: 'created' }])
    expect(report.warnings).toEqual(['package.json: scripts.dev is "bun index.ts", newt\'s is "bun src/index.ts"; newt left it as it is'])
  })

  test('in a dry run, each change sees what the ones before it would write', async () => {
    const cwd = emptyFolder()
    const report = await applyResult({ changes: [
      create('.gitignore', 'node_modules\n'),
      { action: 'ensure-lines', path: '.gitignore', lines: ['node_modules', 'data'] },
      { action: 'ensure-lines', path: '.gitignore', lines: ['data'] },
    ] }, cwd, true)
    expect(report.files).toEqual([{ path: '.gitignore', status: 'created' }])
    expect(readdirSync(cwd)).toEqual([])
  })

  test('keeps the warnings and the next steps', async () => {
    const report = await applyResult({ changes: [], warnings: ['careful'], nextSteps: ['bun dev'] }, emptyFolder(), false)
    expect(report).toEqual({ dryRun: false, files: [], warnings: ['careful'], nextSteps: ['bun dev'] })
  })
})
