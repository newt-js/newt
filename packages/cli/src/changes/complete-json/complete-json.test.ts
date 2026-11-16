import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { diskFiles }    from '../../testing/disk-files/disk-files'
import { virtualFiles } from '../virtual-files/virtual-files'
import { completeJson } from './complete-json'

async function folderWith(path: string, content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-json-'))
  await Bun.write(join(cwd, path), content)
  return cwd
}

describe('completeJson', () => {
  test('adds what is missing, keeping the indentation of the file', async () => {
    const cwd = await folderWith('package.json', '{\n    "name": "shop"\n}\n')
    expect(await completeJson('package.json', { type: 'module' }, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, 'package.json')).text()).toBe('{\n    "name": "shop",\n    "type": "module"\n}\n')
  })

  test('warns of a value that differs, and leaves it', async () => {
    const cwd = await folderWith('package.json', '{ "type": "commonjs" }')
    expect(await completeJson('package.json', { type: 'module' }, diskFiles(cwd))).toEqual({
      status: 'skipped',
      note: 'up to date',
      warnings: ['package.json: type is "commonjs", newt\'s is "module"; newt left it as it is'],
    })
    expect(await Bun.file(join(cwd, 'package.json')).text()).toBe('{ "type": "commonjs" }')
  })

  test('creates the file when it is not there', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-json-'))
    expect((await completeJson('package.json', { name: 'shop' }, diskFiles(cwd))).status).toBe('created')
    expect(await Bun.file(join(cwd, 'package.json')).json()).toEqual({ name: 'shop' })
  })

  test('leaves a file that is not JSON, and warns', async () => {
    const cwd = await folderWith('package.json', '{ nope')
    expect(await completeJson('package.json', { name: 'shop' }, diskFiles(cwd))).toEqual({
      status: 'skipped',
      note: 'not valid JSON',
      failed: true,
      warnings: ['package.json is not valid JSON, so newt left it as it is: add to it {"name":"shop"}'],
    })
  })

  test('the second time, nothing changes', async () => {
    const cwd = await folderWith('package.json', '{ "name": "shop" }')
    await completeJson('package.json', { type: 'module' }, diskFiles(cwd))
    expect((await completeJson('package.json', { type: 'module' }, diskFiles(cwd))).status).toBe('skipped')
  })

  test('a dry run writes nothing', async () => {
    const cwd = await folderWith('package.json', '{ "name": "shop" }')
    expect((await completeJson('package.json', { type: 'module' }, virtualFiles(cwd))).status).toBe('updated')
    expect(await Bun.file(join(cwd, 'package.json')).text()).toBe('{ "name": "shop" }')
  })

  test('completes a JSONC file by its text, its comments and layout kept', async () => {
    const cwd = await folderWith('tsconfig.json', '{\n  "compilerOptions": {\n    // Bundler mode\n    "strict": true,\n  },\n}\n')
    await completeJson('tsconfig.json', { compilerOptions: { lib: ['DOM'] }, exclude: ['x'] }, diskFiles(cwd))
    expect(await Bun.file(join(cwd, 'tsconfig.json')).text()).toBe('{\n  "compilerOptions": {\n    // Bundler mode\n    "strict": true,\n    "lib": [\n      "DOM"\n    ],\n  },\n  "exclude": [\n    "x"\n  ],\n}\n')
  })

  test('adds the items an array lacks on its own line', async () => {
    const cwd = await folderWith('package.json', '{ "workspaces": ["packages/*"] }\n')
    await completeJson('package.json', { workspaces: ['apps/*'] }, diskFiles(cwd))
    expect(await Bun.file(join(cwd, 'package.json')).text()).toBe('{ "workspaces": ["packages/*", "apps/*"] }\n')
  })
})
