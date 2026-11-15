import { afterEach }        from 'bun:test'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { mock }             from 'bun:test'
import { spyOn }            from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { log }              from '../../../../../application/platform/log/log'
import { TransactionSteps } from '../transaction-scope/transaction-scope'
import { endSteps }         from './end-steps'

afterEach(() => {
  mock.restore()
})

const steps = (end?: () => void | Promise<void>): TransactionSteps => ({ begin: () => {}, commit: () => {}, rollback: () => {}, ...end && { end } })

describe('endSteps', () => {
  test('ends the transaction', async () => {
    let ended = false

    await endSteps(steps(async () => {
      ended = true
    }))

    expect(ended).toBe(true)
  })

  // -----

  test('steps with no end are ended at once', async () => {
    await expect(endSteps(steps())).resolves.toBeUndefined()
  })

  // -----

  test('an end that fails is logged, not thrown: the outcome stands', async () => {
    const error = spyOn(log, 'error').mockImplementation(() => {})
    const boom = new Error('boom')

    await endSteps(steps(() => {
      throw boom
    }))

    expect(error).toHaveBeenCalledWith('[database] ending the transaction failed; its outcome stands', { error: boom })
  })
})
