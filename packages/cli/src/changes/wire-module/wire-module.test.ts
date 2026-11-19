import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { diskFiles }   from '../../testing/disk-files/disk-files'
import { wireModule }  from './wire-module'

const CHANGE = {
  action: 'wire-module' as const,
  path: 'm.ts',
  className: 'Shop_Feature',
  name: 'box',
  type: 'Box_Module',
  declaration: '    const box = Box_Module.initialize(base, router)',
  imports: ["import { Box_Module } from './box'"],
}

const EMPTY = `export class Shop_Feature extends Feature {
  static initialize(base, router): Shop_Feature {
    return new Shop_Feature(base)
  }

  private constructor(
    base: ContextBase,
  ) {
    super('shop', base, [])
  }
}
`

async function edited(content: string): Promise<{ text: string, status: string, warnings: string[] }> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-wire-'))
  await Bun.write(join(cwd, 'm.ts'), content)
  const { status, warnings } = await wireModule(CHANGE, diskFiles(cwd))
  return { text: await Bun.file(join(cwd, 'm.ts')).text(), status, warnings }
}

describe('wireModule', () => {
  test('initializes the module, hands it to the constructor, takes it as a readonly and lists it in the super', async () => {
    expect((await edited(EMPTY)).text).toBe(`import { Box_Module } from './box'

export class Shop_Feature extends Feature {
  static initialize(base, router): Shop_Feature {
    const box = Box_Module.initialize(base, router)
    return new Shop_Feature(base, box)
  }

  private constructor(
    base: ContextBase,
    readonly box: Box_Module,
  ) {
    super('shop', base, [box])
  }
}
`)
  })

  test('after the modules it has', async () => {
    const { text } = await edited(EMPTY
      .replace('    return', '    const order = Order_Module.initialize(base, router)\n    return')
      .replace('(base)', '(base, order)')
      .replace('    base: ContextBase,\n', '    base: ContextBase,\n    readonly order: Order_Module,\n')
      .replace('[]', '[order]'))
    expect(text).toContain('    const order = Order_Module.initialize(base, router)\n    const box = Box_Module.initialize(base, router)\n    return new Shop_Feature(base, order, box)')
    expect(text).toContain('    readonly order: Order_Module,\n    readonly box: Box_Module,\n  ) {')
    expect(text).toContain("super('shop', base, [order, box])")
  })

  test('a module initialized with its deps is not initialized again', async () => {
    const text = `import { Box_Module } from './box'

export class Shop_Feature extends Feature {
  static initialize(base, router): Shop_Feature {
    const box = Box_Module.initialize(base, router, { order })
    return new Shop_Feature(base, box)
  }

  private constructor(base: ContextBase, readonly box: Box_Module) {
    super('shop', base, [box])
  }
}
`
    expect(await edited(text)).toEqual({ text, status: 'skipped', warnings: [] })
  })

  test('a constructor on one line keeps it so, and a super with no list is left as it is', async () => {
    const { text } = await edited(EMPTY.replace('(\n    base: ContextBase,\n  )', '(base: ContextBase)').replace("super('shop', base, [])", "super('shop', base)"))
    expect(text).toContain('  private constructor(base: ContextBase, readonly box: Box_Module) {\n')
    expect(text).toContain("super('shop', base)\n")
  })

  test('a last parameter on its own line without its comma takes one', async () => {
    const { text } = await edited(EMPTY.replace('    base: ContextBase,\n', '    base: ContextBase\n'))
    expect(text).toContain('    base: ContextBase,\n    readonly box: Box_Module,\n  ) {')
  })

  test('with a constructor that takes nothing, changes nothing and says what to add', async () => {
    const result = await edited(EMPTY.replace('(\n    base: ContextBase,\n  )', '()'))
    expect(result.status).toBe('skipped')
    expect(result.warnings[0]).toStartWith('m.ts is not as newt wrote it, so newt did not change it: add')
  })

  test('without the class as newt writes it, changes nothing and says what to add', async () => {
    const result = await edited('export const modules = []\n')
    expect(result.text).toBe('export const modules = []\n')
    expect(result.warnings[0]).toStartWith('m.ts is not as newt wrote it, so newt did not change it: add')
  })
})
