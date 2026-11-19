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
  className: 'Shop_Context',
  name: 'box',
  type: 'Box_Module',
  declaration: '    const box = Box_Module.initialize(base, router)',
  imports: ["import { Box_Module } from './box'"],
}

const EMPTY = `export class Shop_Context extends BoundedContext {
  static initialize(base, router): Shop_Context {
    return new Shop_Context(base, {})
  }

  private constructor(
    base: ContextBase,
    modules: {},
  ) {
    super('shop', base, modules)
  }
}
`

const WITH_ORDER = `export class Shop_Context extends BoundedContext {
  static initialize(base, router): Shop_Context {
    const order = Order_Module.initialize(base, router)
    return new Shop_Context(base, { order })
  }

  private readonly order: Order_Module

  private constructor(
    base: ContextBase,
    modules: {
      order: Order_Module,
    },
  ) {
    super('shop', base, modules)
    this.order = modules.order
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
  test('initializes the module, gives it by name to the constructor, types it there and holds it in a field', async () => {
    expect((await edited(EMPTY)).text).toBe(`import { Box_Module } from './box'

export class Shop_Context extends BoundedContext {
  static initialize(base, router): Shop_Context {
    const box = Box_Module.initialize(base, router)
    return new Shop_Context(base, { box })
  }

  private readonly box: Box_Module

  private constructor(
    base: ContextBase,
    modules: {
      box: Box_Module,
    },
  ) {
    super('shop', base, modules)
    this.box = modules.box
  }
}
`)
  })

  test('after the modules it has', async () => {
    const { text } = await edited(WITH_ORDER)
    expect(text).toContain('    const order = Order_Module.initialize(base, router)\n    const box = Box_Module.initialize(base, router)\n    return new Shop_Context(base, { order, box })')
    expect(text).toContain('  private readonly order: Order_Module\n  private readonly box: Box_Module\n\n  private constructor(')
    expect(text).toContain('    modules: {\n      order: Order_Module,\n      box: Box_Module,\n    },\n  ) {')
    expect(text).toContain('    this.order = modules.order\n    this.box = modules.box\n  }')
  })

  test('a module already wired, initialized with its deps, is left as it is', async () => {
    const text = `import { Box_Module } from './box'

${WITH_ORDER.replaceAll('order', 'box').replaceAll('Order', 'Box').replace('Box_Module.initialize(base, router)', 'Box_Module.initialize(base, router, { order })')}`
    expect(await edited(text)).toEqual({ text, status: 'skipped', warnings: [] })
  })

  test('a last member without its comma takes one', async () => {
    const { text } = await edited(WITH_ORDER.replace('      order: Order_Module,\n', '      order: Order_Module\n'))
    expect(text).toContain('      order: Order_Module,\n      box: Box_Module,\n    },')
  })

  test('without the object, the typed parameter or the super, changes nothing and says what to add', async () => {
    for (const content of [
      EMPTY.replace('(base, {})', '(base)'),
      EMPTY.replace('    modules: {},\n', ''),
      EMPTY.replace("    super('shop', base, modules)\n", ''),
      'export const modules = []\n',
    ]) {
      const result = await edited(content)
      expect(result).toMatchObject({ text: content, status: 'skipped' })
      expect(result.warnings[0]).toStartWith('m.ts is not as newt wrote it, so newt did not change it: add')
    }
  })
})
