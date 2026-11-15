import { afterEach } from 'bun:test'
import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { mock }      from 'bun:test'
import { spyOn }     from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { log }       from '../../../../../application/platform/log/log'
import { runEach }   from './run-each'

afterEach(() => {
  mock.restore()
})

describe('runEach', () => {
  test('runs every callback in order', () => {
    const ran: number[] = []

    runEach([() => ran.push(1), () => ran.push(2), () => ran.push(3)], 'unused')

    expect(ran).toEqual([1, 2, 3])
  })

  // -----

  test('logs a callback that throws with the failure given, and still runs the ones after it', () => {
    const error = spyOn(log, 'error').mockImplementation(() => {})
    const ran: number[] = []
    const boom = new Error('boom')

    runEach([() => {
      throw boom
    }, () => ran.push(2)], 'a callback after a commit failed')

    expect(ran).toEqual([2])
    expect(error).toHaveBeenCalledWith('[database] a callback after a commit failed', { error: boom })
  })
})
