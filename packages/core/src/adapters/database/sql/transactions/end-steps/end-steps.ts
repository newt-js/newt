import { log }              from '../../../../../application/platform/log/log'
import { TransactionSteps } from '../transaction-scope/transaction-scope'

export async function endSteps(steps: TransactionSteps): Promise<void> {
  try {
    await steps.end?.()
  } catch (error) {
    log.error('[database] ending the transaction failed; its outcome stands', { error })
  }
}
