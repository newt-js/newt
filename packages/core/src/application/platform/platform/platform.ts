import { noObservability }    from '../../../domain/observability/no-observability/no-observability'
import type { Observability } from '../../../domain/observability/observability'
import type { Cluster }       from '../../cluster/cluster'
import { MemoryCluster }      from '../../cluster/memory-cluster/memory-cluster'
import { ConsoleLogger }      from '../../logs/console-logger/console-logger'
import type { Logger }        from '../../logs/log-line'

export type PlatformOptions = {
  logger?: Logger | undefined
  observability?: Observability | undefined
  /** Shared state across the backend's instances; an in-memory one, for a single instance, unless told. */
  cluster?: Cluster | undefined
}

export class Platform {

  readonly cluster: Cluster

  private loggerInUse: Logger
  private observabilityInUse: Observability

  constructor(options: PlatformOptions = {}) {
    this.loggerInUse = options.logger ?? new ConsoleLogger()
    this.observabilityInUse = options.observability ?? noObservability
    this.cluster = options.cluster ?? new MemoryCluster()
  }

  get logger(): Logger {
    return this.loggerInUse
  }

  get observability(): Observability {
    return this.observabilityInUse
  }

  useLogger(logger: Logger): void {
    this.loggerInUse = logger
  }

  useObservability(observability: Observability): void {
    this.observabilityInUse = observability
  }
}
