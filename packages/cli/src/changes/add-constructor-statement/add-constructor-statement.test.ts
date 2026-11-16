import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
import { mkdtempSync }             from 'node:fs'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'
// --------------------------------------------------------
import { diskFiles }               from '../../testing/disk-files/disk-files'
import { addConstructorStatement } from './add-constructor-statement'

const CHANGE = { action: 'add-constructor-statement' as const, path: 'm.ts', className: 'M', statement: 'this.b = 2' }

async function edited(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-constructor-'))
  await Bun.write(join(cwd, 'm.ts'), content)
  await addConstructorStatement(CHANGE, diskFiles(cwd))
  return Bun.file(join(cwd, 'm.ts')).text()
}

describe('addConstructorStatement', () => {
  test('adds the statement at the end of the constructor', async () => {
    expect(await edited('class M {\n  constructor() {\n    this.a = 1\n  }\n}\n')).toBe('class M {\n  constructor() {\n    this.a = 1\n    this.b = 2\n  }\n}\n')
  })

  test('one it has already is left alone', async () => {
    const text = 'class M {\n  constructor() {\n    this.b = 2\n  }\n}\n'
    expect(await edited(text)).toBe(text)
  })

  test('without a constructor, changes nothing and says what to add', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-constructor-'))
    await Bun.write(join(cwd, 'm.ts'), 'class M {}\n')
    expect((await addConstructorStatement(CHANGE, diskFiles(cwd))).warnings).toEqual(['m.ts has no constructor of M, so newt did not change it: add to it this.b = 2'])
  })
})
