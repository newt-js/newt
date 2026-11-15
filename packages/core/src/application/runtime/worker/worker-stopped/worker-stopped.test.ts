import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { WorkerStopped } from './worker-stopped'

describe('WorkerStopped', () => {
  test('is an abort, as a handler that heeds its signal expects', () => {
    const error = new WorkerStopped()

    expect(error.name).toBe('AbortError')
    expect(error.message).toBe('The worker stops, and waits no longer for this job')
  })
})
