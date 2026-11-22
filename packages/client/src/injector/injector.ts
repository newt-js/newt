import type { Disposable }   from './disposable'
import type { ServiceClass } from './service-class'

/**
 * Hands out services. The root creates any service the first time it is asked for it; a child creates only
 * the services it provides and asks its parent for the rest. A service is built with its own injector in scope,
 * so `inject` inside it reaches its level and above, never below.
 */
export class Injector {

  /** The injector building a service right now: the one `inject` asks. */
  static current: Injector | null = null

  private readonly instances = new Map<ServiceClass, unknown>()
  private readonly building = new Set<ServiceClass>()

  constructor(
    private readonly parent: Injector | null = null,
    private readonly provided: ServiceClass[] | null = null,
  ) {}

  get<T>(service: ServiceClass<T>): T {
    const providedElsewhere = this.parent && !this.provided?.includes(service)
    if (providedElsewhere) return this.parent.get(service)
    if (!this.instances.has(service)) this.instances.set(service, this.build(service))
    return this.instances.get(service) as T
  }

  /** Releases every service this injector created, and only those. */
  dispose(): void {
    for (const instance of this.instances.values()) (instance as Partial<Disposable>).dispose?.()
    this.instances.clear()
  }

  private build<T>(service: ServiceClass<T>): T {
    if (this.building.has(service)) throw new Error(`Circular dependency while building ${service.name}`)
    const previous = Injector.current
    this.building.add(service)
    Injector.current = this
    try {
      return new service()
    } finally {
      Injector.current = previous
      this.building.delete(service)
    }
  }
}
