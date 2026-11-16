import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { mkdtempSync }    from 'node:fs'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { diskFiles }      from '../../testing/disk-files/disk-files'
import { virtualFiles }   from '../virtual-files/virtual-files'
import { addClassMember } from './add-class-member'

const FILE = "import { Module } from 'core'\n\nexport class Order_Module extends Module {\n  get(): number {\n    return 1\n  }\n}\n\nexport const after = 1\n"

const CHANGE = {
  action: 'add-class-member' as const,
  path: 'order.module.ts',
  className: 'Order_Module',
  name: 'rename',
  member: '  rename(): number {\n    return 2\n  }',
  imports: ["import { UseCase } from 'core'"],
}

async function folderWith(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-member-'))
  await Bun.write(join(cwd, 'order.module.ts'), content)
  return cwd
}

const read = (cwd: string) => Bun.file(join(cwd, 'order.module.ts')).text()

describe('addClassMember', () => {
  test('adds the member at the end of the class, and its imports', async () => {
    const cwd = await folderWith(FILE)
    expect(await addClassMember(CHANGE, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await read(cwd)).toBe("import { Module } from 'core'\nimport { UseCase } from 'core'\n\nexport class Order_Module extends Module {\n  get(): number {\n    return 1\n  }\n\n  rename(): number {\n    return 2\n  }\n}\n\nexport const after = 1\n")
  })

  test('the second time, nothing changes', async () => {
    const cwd = await folderWith(FILE)
    await addClassMember(CHANGE, diskFiles(cwd))
    expect((await addClassMember(CHANGE, diskFiles(cwd))).status).toBe('skipped')
  })

  test('a member of that name, however it is written, is the same', async () => {
    for (const written of ['#rename = 1', "'rename'() {}", "['rename'] = 1"]) {
      const cwd = await folderWith(`export class Order_Module extends Module {\n  ${written}\n}\n`)
      expect((await addClassMember(CHANGE, diskFiles(cwd))).status).toBe('skipped')
    }
  })

  test('without the class, changes nothing and says what to add', async () => {
    const cwd = await folderWith('export const x = 1\n')
    const outcome = await addClassMember(CHANGE, diskFiles(cwd))
    expect(outcome.status).toBe('skipped')
    expect(outcome.warnings).toEqual(['order.module.ts has no class Order_Module, so newt did not change it: add to it\n  rename(): number {\n    return 2\n  }'])
  })

  test('a dry run writes nothing', async () => {
    const cwd = await folderWith(FILE)
    expect((await addClassMember(CHANGE, virtualFiles(cwd))).status).toBe('updated')
    expect(await read(cwd)).toBe(FILE)
  })
})
