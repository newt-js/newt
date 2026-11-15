import { Observability } from '../../../domain/observability/observability'
import { log }           from '../log/log'
import { platformScope } from '../platform-scope/platform-scope'
import { Platform }      from '../platform/platform'

export function observedBy(platform: Platform): Observability {
  return {
    useCase: (call, run) => platformScope.run(platform, () => platform.observability.useCase(call, run)),
    warn: (message, fields) => {
      platformScope.run(platform, () => log.warn(message, fields))
      platform.observability.warn(message, fields)
    },
  }
}
