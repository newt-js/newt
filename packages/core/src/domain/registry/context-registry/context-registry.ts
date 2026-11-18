import type { RegisteredModule }       from '../registered-module'
import type { RegisteredSubscription } from '../registered-subscription'

export class ContextRegistry {

  private readonly modules = new Map<string, RegisteredModule>()
  private readonly features = new Map<string, string[]>()
  private readonly cronOf = new Map<string, string>()
  private readonly subscribed = new Set<RegisteredSubscription>()

  constructor(readonly context: string) {}

  module(instance: { readonly name: string }, deps?: object): void {
    this.modules.set(instance.name, { instance, className: instance.constructor.name, deps, useCases: new Map() })
  }

  /** A feature, by its name, with its modules' own names: defined again, it takes the place of the one before. */
  feature(name: string, modules: string[]): void {
    this.features.set(name, modules)
  }

  useCase(instance: { readonly name: string }, name: string, options: object = {}): void {
    let module = this.modules.get(instance.name)
    if (module?.instance !== instance) {
      this.module(instance)
      module = this.modules.get(instance.name)!
    }
    module.useCases.set(name, options)
  }

  isUseCase(name: string): boolean {
    const dot = name.indexOf('.')
    return this.modules.get(name.slice(0, dot))?.useCases.has(name.slice(dot + 1)) ?? false
  }

  schedule(name: string, cron: string): void {
    this.cronOf.set(name, cron)
  }

  subscription(subscription: RegisteredSubscription): () => void {
    this.subscribed.add(subscription)
    return () => this.subscribed.delete(subscription)
  }

  get registeredModules(): RegisteredModule[] {
    return [...this.modules.values()]
  }

  /** Each feature defined, with its modules' own names. */
  get registeredFeatures(): { name: string, modules: string[] }[] {
    return [...this.features].map(([name, modules]) => ({ name, modules }))
  }

  cron(event: string): string | undefined {
    return this.cronOf.get(event)
  }

  get subscriptions(): RegisteredSubscription[] {
    return [...this.subscribed]
  }
}
