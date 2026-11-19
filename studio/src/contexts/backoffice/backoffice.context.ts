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

export class Backoffice_Context extends BoundedContext {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
  ): Backoffice_Context {
    return new Backoffice_Context(base, {})
  }

  private constructor(
    base: ContextBase,
    modules: {},
  ) {
    super('backoffice', base, modules)
  }

  static async open(
    platform: Platform,
    place: DataPlace,
  ): Promise<ContextToRun & { context: Backoffice_Context }> {
    const router = new HttpRouter({ prefix: '/backoffice/api' })
    router.authenticateWith(authenticate)
    const host = Bun.env.BACKOFFICE_HOST
    const { database, storage } = await openData('backoffice', {
      database: { adapter: sqlite(), migrations: MIGRATIONS_FOLDER },
      files: localFiles(),
      router,
      place,
      host,
    })
    const base = new ContextBase({
      name: 'backoffice',
      platform,
      database,
      storage,
    })
    const context = Backoffice_Context.initialize(base, router)
    return { context, router, host }
  }

}
