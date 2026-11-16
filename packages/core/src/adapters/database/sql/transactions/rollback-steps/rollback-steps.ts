import { log }                   from '../../../../../application/platform/log/log'
import type { TransactionSteps } from '../transaction-scope/transaction-scope'

export async function rollbackSteps(steps: TransactionSteps): Promise<void> {
  try {
    await steps.rollback()
  } catch (error) {
    log.error('[database] rolling back after an error failed too; the first error is the one thrown', { error })
  }
}
