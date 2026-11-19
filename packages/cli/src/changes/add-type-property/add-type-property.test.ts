import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtempSync }     from 'node:fs'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { diskFiles }       from '../../testing/disk-files/disk-files'
import { addTypeProperty } from './add-type-property'

const CHANGE = { action: 'add-type-property' as const, path: 'd.ts', type: 'Deps', key: 'users', value: 'Users_Feature', imports: [], in: 'auth' }

async function edited(content: string, change: typeof CHANGE | Omit<typeof CHANGE, 'in'> = CHANGE): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-type-'))
  await Bun.write(join(cwd, 'd.ts'), content)
  await addTypeProperty(change, diskFiles(cwd))
  return Bun.file(join(cwd, 'd.ts')).text()
}

describe('addTypeProperty', () => {
  test('a member on a line of its own, at the end', async () => {
    const { in: _, ...flat } = CHANGE
    expect(await edited('export type Deps = {\n  plan: Plan_Module\n}\n', flat)).toBe('export type Deps = {\n  plan: Plan_Module\n  users: Users_Feature\n}\n')
    expect(await edited('export type Deps = {\n}\n', flat)).toBe('export type Deps = {\n  users: Users_Feature\n}\n')
  })

  test('with in, under that key, added with it when there is none', async () => {
    expect(await edited('export type Deps = {\n  plan: Plan_Module\n}\n')).toBe('export type Deps = {\n  plan: Plan_Module\n  auth: { users: Users_Feature }\n}\n')
    const roles = { ...CHANGE, key: 'roles', value: 'Roles_Feature' }
    expect(await edited('export type Deps = {\n  auth: { users: Users_Feature }\n}\n', roles)).toBe('export type Deps = {\n  auth: { users: Users_Feature, roles: Roles_Feature }\n}\n')
  })

  test('a key it has already is left alone', async () => {
    const text = 'export type Deps = {\n  auth: { users: Users_Feature }\n}\n'
    expect(await edited(text)).toBe(text)
  })

  test('without the type, changes nothing and says what to add', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-type-'))
    await Bun.write(join(cwd, 'd.ts'), 'export const x = 1\n')
    expect((await addTypeProperty(CHANGE, diskFiles(cwd))).warnings).toEqual(['d.ts has no type Deps = { … }, so newt did not change it: add auth: { users: Users_Feature } to it'])
  })
})
