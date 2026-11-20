import { BoundedContext }       from '@newt-js/core/application'
import { ContextBase }          from '@newt-js/core/application'
import type { DataPlace }       from '@newt-js/core/application'
import type { Platform }        from '@newt-js/core/application'
import { sqlite }               from '@newt-js/core/database/sqlite'
import { localFiles }           from '@newt-js/core/files/local'
import type { ContextToRun }    from '@newt-js/core/http'
import { HttpRouter }           from '@newt-js/core/http'
import { openData }             from '@newt-js/core/http'
import { join }                 from 'node:path'
// --------------------------------------------------------
import { authenticate }         from './authenticate'
import { SignInAttempt_Module } from './modules/sign-in-attempt/sign-in-attempt.module'
import { SignInSession_Module } from './modules/sign-in-session/sign-in-session.module'

const MIGRATIONS_FOLDER = join(import.meta.dir, 'migrations')

export class Backoffice_Context extends BoundedContext {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
  ): Backoffice_Context {
    const signInAttempt = SignInAttempt_Module.initialize(base, router)
    const signInSession = SignInSession_Module.initialize(base, router, {
      signInAttempt,
    })
    return new Backoffice_Context(base, { signInAttempt, signInSession })
  }

  private readonly signInAttempt: SignInAttempt_Module
  private readonly signInSession: SignInSession_Module

  private constructor(
    base: ContextBase,
    modules: {
      signInAttempt: SignInAttempt_Module,
      signInSession: SignInSession_Module,
    },
  ) {
    super('backoffice', base, modules)
    this.signInAttempt = modules.signInAttempt
    this.signInSession = modules.signInSession
  }

  static async open(
    platform: Platform,
    place: DataPlace,
  ): Promise<ContextToRun & { context: Backoffice_Context }> {
    const router = new HttpRouter({ prefix: '/backoffice/api' })
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
    router.authenticateWith(authenticate(context.signInSession))
    return { context, router, host }
  }

}
