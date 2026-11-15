import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { spyOn }    from 'bun:test'
import { test }     from 'bun:test'
import { z }        from 'zod'
// --------------------------------------------------------
import { uuidV7 }   from './uuid-v7'

describe('uuidV7', () => {
  test('is a v7 uuid', () => {
    expect(z.uuidv7().safeParse(uuidV7()).success).toBe(true)
  })

  test('sorts by when it was made, within the same millisecond too', () => {
    const ids = Array.from({ length: 1000 }, () => uuidV7())

    expect([...ids].sort()).toEqual(ids)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('keeps sorting when more are made in one millisecond than its counter holds', () => {
    const clock = spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 1))
    try {
      const ids = Array.from({ length: 5000 }, () => uuidV7())

      expect(ids.every((id, index) => index === 0 || id > ids[index - 1]!)).toBe(true)
    } finally {
      clock.mockRestore()
    }
  })

  test('keeps sorting when the clock goes back', () => {
    const clock = spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 2))
    try {
      const first = uuidV7()
      clock.mockReturnValue(Date.UTC(2026, 0, 1))

      expect(uuidV7() > first).toBe(true)
    } finally {
      clock.mockRestore()
    }
  })
})
