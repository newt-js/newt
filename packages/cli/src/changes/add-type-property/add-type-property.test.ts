import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtempSync }     from 'node:fs'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { diskFiles }       from '../../testing/disk-files/disk-files'
import { addTypeProperty } from './add-type-property'

const CHANGE = { action: 'add-type-property' as const, path: 'd.ts', type: 'Deps', key: 'auth', value: 'Auth_Context', imports: [] }

async function edited(content: string, change = CHANGE): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-type-'))
  await Bun.write(join(cwd, 'd.ts'), content)
  await addTypeProperty(change, diskFiles(cwd))
  return Bun.file(join(cwd, 'd.ts')).text()
}

describe('addTypeProperty', () => {
  test('a member on a line of its own, at the end', async () => {
    expect(await edited('export type Deps = {\n  plan: Plan_Module\n}\n')).toBe('export type Deps = {\n  plan: Plan_Module\n  auth: Auth_Context\n}\n')
    expect(await edited('export type Deps = {\n}\n')).toBe('export type Deps = {\n  auth: Auth_Context\n}\n')
  })

  test('on its line, when the type is written on one', async () => {
    expect(await edited('export type Deps = { plan: Plan_Module }\n')).toBe('export type Deps = { plan: Plan_Module, auth: Auth_Context }\n')
  })

  test('a key it has already is left alone', async () => {
    const text = 'export type Deps = {\n  auth: Auth_Context\n}\n'
    expect(await edited(text)).toBe(text)
  })

  test('without the type, changes nothing and says what to add', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-type-'))
    await Bun.write(join(cwd, 'd.ts'), 'export const x = 1\n')
    expect((await addTypeProperty(CHANGE, diskFiles(cwd))).warnings).toEqual(['d.ts has no type Deps = { … }, so newt did not change it: add auth: Auth_Context to it'])
  })
})
