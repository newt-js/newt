import { noObservability } from '../../../domain/observability/no-observability/no-observability'
import { Observability }   from '../../../domain/observability/observability'
import { Cluster }         from '../../cluster/cluster'
import { ConsoleLogger }   from '../../logs/console-logger/console-logger'
import { Logger }          from '../../logs/log-line'

export type PlatformOptions = {
  logger?: Logger | undefined
  observability?: Observability | undefined
  cluster: Cluster
}

export class Platform {

  readonly cluster: Cluster

  private loggerInUse: Logger
  private observabilityInUse: Observability

  constructor(options: PlatformOptions) {
    this.loggerInUse = options.logger ?? new ConsoleLogger()
    this.observabilityInUse = options.observability ?? noObservability
    this.cluster = options.cluster
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
