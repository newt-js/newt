import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { diskFiles }   from '../../testing/disk-files/disk-files'
import { wireModule }  from './wire-module'

const CHANGE = { action: 'wire-module' as const, path: 'm.ts', functionName: 'shopModules', module: 'box', declaration: '  const box = Box_Module.initialize(base, router)', imports: ["import { Box_Module } from './box'"] }

async function edited(content: string): Promise<{ text: string, status: string, warnings: string[] }> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-wire-'))
  await Bun.write(join(cwd, 'm.ts'), content)
  const { status, warnings } = await wireModule(CHANGE, diskFiles(cwd))
  return { text: await Bun.file(join(cwd, 'm.ts')).text(), status, warnings }
}

describe('wireModule', () => {
  test('declares the module before the return and returns it, in an empty object', async () => {
    expect((await edited('export function shopModules(base, router) {\n  return {\n  }\n}\n')).text).toBe("import { Box_Module } from './box'\n\nexport function shopModules(base, router) {\n  const box = Box_Module.initialize(base, router)\n  return {\n    box,\n  }\n}\n")
  })

  test('after the modules it has, past a block before the return', async () => {
    const { text } = await edited('export function shopModules(base, router) {\n  if (base) {\n    log()\n  }\n  const order = Order_Module.initialize(base, router)\n  return { // every module\n    order,\n  }\n}\n')
    expect(text).toContain('  }\n  const order = Order_Module.initialize(base, router)\n  const box = Box_Module.initialize(base, router)\n  return { // every module\n    order,\n    box,\n  }')
  })

  test('a module declared with its deps is not declared again', async () => {
    const text = "import { Box_Module } from './box'\n\nexport function shopModules(base, router) {\n  const box = Box_Module.initialize(base, router, { order })\n  return {\n    box,\n  }\n}\n"
    expect(await edited(text)).toEqual({ text, status: 'skipped', warnings: [] })
  })

  test('in the function of the context alone, never in a helper above it', async () => {
    const { text } = await edited('function helper() {\n  return { x: 1 }\n}\n\nexport function shopModules(base, router) {\n  return {\n  }\n}\n')
    expect(text).toContain('function helper() {\n  return { x: 1 }\n}')
    expect(text).toContain('  const box = Box_Module.initialize(base, router)\n  return {\n    box,\n  }')
  })

  test('without a function that returns an object, changes nothing and says what to add', async () => {
    const result = await edited('export const modules = []\n')
    expect(result.text).toBe('export const modules = []\n')
    expect(result.warnings[0]).toStartWith('m.ts is not as newt wrote it, so newt did not change it: add')
  })
})
