import type { Feature } from '../../../domain/feature/feature/feature'
import { featureOf }    from '../../../domain/feature/is-feature/is-feature'
import { ContextBase }  from '../context-base/context-base'

/**
 * A bounded context: it builds its features in its `static initialize`, is given them by name and
 * holds each one in a field. Every feature it is given must be its own, under its own name.
 */
export abstract class BoundedContext<B extends ContextBase = ContextBase> {

  protected constructor(
    readonly name: string,
    readonly base: B,
    features: Readonly<Record<string, Feature>> = {},
  ) {
    for (const [key, feature] of Object.entries(features)) {
      const { name: featureName, context } = featureOf(feature)
      if (context !== name) {
        throw new Error(`The context ${name}: ${featureName} is a feature of the context ${context}: a context holds only its own features`)
      }
      if (featureName !== key) {
        throw new Error(`The context ${name}: ${featureName} is given as ${key}: each feature goes under its own name, ${featureName}`)
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
