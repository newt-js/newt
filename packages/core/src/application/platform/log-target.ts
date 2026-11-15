import { Logger } from '../logs/log-line'

export type LogTarget = {
  readonly logger: Logger
  useLogger(logger: Logger): void
}
