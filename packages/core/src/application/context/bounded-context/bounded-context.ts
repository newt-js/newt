import type { Module } from '../../../domain/module/module/module'
import { ContextBase } from '../context-base/context-base'

export const CONTEXT_BRAND: unique symbol = Symbol.for('@newt-js/core/context')

/** That a value is a bounded context, as another context's module is given it. */
export function isBoundedContext(value: unknown): value is { readonly name: string, readonly [CONTEXT_BRAND]: true } {
  return typeof value === 'object' && value !== null && (value as { [CONTEXT_BRAND]?: unknown })[CONTEXT_BRAND] === true
}

/**
 * A bounded context: it builds its modules in its `static initialize` and holds each in a field,
 * private, or public once it publishes it: another context reaches only those. Every module it
 * is given must be its own, under its own name.
 */
export abstract class BoundedContext<B extends ContextBase = ContextBase> {

  get [CONTEXT_BRAND](): true {
    return true
  }

  protected constructor(
    readonly name: string,
    readonly base: B,
    modules: Readonly<Record<string, Module>> = {},
  ) {
    for (const [key, module] of Object.entries(modules)) {
      const { context } = module.useCaseRunner.registry
      if (context !== name) {
        throw new Error(`The context ${name}: ${module.name} is a module of the context ${context}: a context holds only its own modules`)
      }
      if (module.name !== key) {
        throw new Error(`The context ${name}: ${module.name} is given as ${key}: each module goes under its own name, ${module.name}`)
      }
    }
  }

  start(): void {
    this.base.worker.start()
    this.base.schedules.start()
  }

  async stopWorker(deadlineMs?: number): Promise<void> {
    await Promise.all([this.base.schedules.stop(), this.base.worker.stop(deadlineMs)])
  }

  async close(): Promise<void> {
    await this.base.close()
  }

  async stop(): Promise<void> {
    await this.stopWorker()
    await this.close()
  }
}
