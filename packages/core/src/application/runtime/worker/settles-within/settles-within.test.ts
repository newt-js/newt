import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { settlesWithin } from './settles-within'

describe('settlesWithin', () => {
  test('says whether a promise settles, kept or broken, in time', async () => {
    expect(await settlesWithin(Promise.resolve(), 10)).toBe(true)
    expect(await settlesWithin(Promise.reject(new Error('no')), 10)).toBe(true)
    expect(await settlesWithin(new Promise(() => {}), 10)).toBe(false)
  })
})
