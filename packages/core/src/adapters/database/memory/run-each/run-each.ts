import { log } from '../../../../application/platform/log/log'

export function runEach(callbacks: (() => void)[], failure: string): void {
  for (const each of callbacks) {
    try {
      each()
    } catch (error) {
      log.error(`[database] ${failure}`, { error })
    }
  }
}
