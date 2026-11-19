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
import { authenticate }      from '../../auth'

const MIGRATIONS_FOLDER = join(import.meta.dir, 'migrations')

export class Auth_Context extends BoundedContext {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
  ): Auth_Context {
    return new Auth_Context(base, {})
  }

  private constructor(
    base: ContextBase,
    features: {},
  ) {
    super('auth', base, features)
  }

  static async open(
    platform: Platform,
    place: DataPlace,
  ): Promise<ContextToRun & { context: Auth_Context }> {
    const router = new HttpRouter({ prefix: '/auth/api' })
    router.authenticateWith(authenticate)
    const host = Bun.env.AUTH_HOST
    const { database, storage } = await openData('auth', {
      database: { adapter: sqlite(), migrations: MIGRATIONS_FOLDER },
      files: localFiles(),
      router,
      place,
      host,
    })
    const base = new ContextBase({
      name: 'auth',
      platform,
      database,
      storage,
    })
    const context = Auth_Context.initialize(base, router)
    return { context, router, host }
  }

}
