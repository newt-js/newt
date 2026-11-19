import { BoundedContext }    from '@newt-js/core/application'
import { ContextBase }       from '@newt-js/core/application'
import type { DataPlace }    from '@newt-js/core/application'
import type { Platform }     from '@newt-js/core/application'
import { sqlite }            from '@newt-js/core/database/sqlite'
import { localFiles }        from '@newt-js/core/files/local'
import type { ContextToRun } from '@newt-js/core/http'
import { HttpRouter }        from '@newt-js/core/http'
import { openData }          from '@newt-js/core/http'
import { join }              from 'node:path'
// --------------------------------------------------------
import { authenticate }      from './authenticate'

const MIGRATIONS_FOLDER = join(import.meta.dir, 'migrations')

export class Panel_Context extends BoundedContext {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
  ): Panel_Context {
    return new Panel_Context(base, {})
  }

  private constructor(
    base: ContextBase,
    modules: {},
  ) {
    super('panel', base, modules)
  }

  static async open(
    platform: Platform,
    place: DataPlace,
  ): Promise<ContextToRun & { context: Panel_Context }> {
    const router = new HttpRouter({ prefix: '/panel/api' })
    router.authenticateWith(authenticate)
    const host = Bun.env.PANEL_HOST
    const { database, storage } = await openData('panel', {
      database: { adapter: sqlite(), migrations: MIGRATIONS_FOLDER },
      files: localFiles(),
      router,
      place,
      host,
    })
    const base = new ContextBase({
      name: 'panel',
      platform,
      database,
      storage,
    })
    const context = Panel_Context.initialize(base, router)
    return { context, router, host }
  }

}
