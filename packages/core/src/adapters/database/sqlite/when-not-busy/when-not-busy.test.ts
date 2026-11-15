import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { whenNotBusy } from './when-not-busy'

const busy = () => Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' })

describe('whenNotBusy', () => {
  test('runs the call once when it succeeds', () => {
    let calls = 0
    whenNotBusy(() => {
      calls++
    })
    expect(calls).toBe(1)
  })

  // -----

  test('tries again while the database is busy, until the call goes through', () => {
    let calls = 0
    whenNotBusy(() => {
      calls++
      if (calls < 3) {
        throw busy()
      }
    })
    expect(calls).toBe(3)
  })

  // -----

  test('throws at once an error that is not about the database being busy', () => {
    let calls = 0
    const failure = new Error('no such table')
    expect(() => whenNotBusy(() => {
      calls++
      throw failure
    })).toThrow(failure)
    expect(calls).toBe(1)
  })
})
