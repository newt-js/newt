import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { AsyncLocalStorage } from 'node:async_hooks'
// --------------------------------------------------------
import { detached }          from './detached'

describe('detached', () => {
  test('runs a function outside the stores of its caller, and gives back what it returns', () => {
    const storage = new AsyncLocalStorage<string>()

    const seen = storage.run('caller', () => detached(() => storage.getStore()))

    expect(seen).toBeUndefined()
    expect(detached(() => 42)).toBe(42)
  })
})
