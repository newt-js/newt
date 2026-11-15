import { afterEach }     from 'bun:test'
import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { mock }          from 'bun:test'
import { spyOn }         from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { log }           from '../../../../../application/platform/log/log'
import { rollbackSteps } from './rollback-steps'

afterEach(() => {
  mock.restore()
})

const steps = (rollback: () => void | Promise<void>) => ({ begin: () => {}, commit: () => {}, rollback })

describe('rollbackSteps', () => {
  test('rolls the transaction back', async () => {
    let rolledBack = false

    await rollbackSteps(steps(async () => {
      rolledBack = true
    }))

    expect(rolledBack).toBe(true)
  })

  // -----

  test('a rollback that fails is logged, not thrown, so the first error is the one that reaches the caller', async () => {
    const error = spyOn(log, 'error').mockImplementation(() => {})
    const boom = new Error('boom')

    await rollbackSteps(steps(async () => {
      throw boom
    }))

    expect(error).toHaveBeenCalledWith('[database] rolling back after an error failed too; the first error is the one thrown', { error: boom })
  })
})
