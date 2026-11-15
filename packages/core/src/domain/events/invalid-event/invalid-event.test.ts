import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { z }            from 'zod'
// --------------------------------------------------------
import { InvalidEvent } from './invalid-event'

describe('InvalidEvent', () => {
  test('is a programming error that names each field that fails, with zod error as its cause', () => {
    const parsed = z.object({ id: z.string() }).safeParse({ id: 1 })
    const error = new InvalidEvent('order.placed', parsed.error!)

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('InvalidEvent')
    expect(error.message).toStartWith("order.placed's payload does not pass its schema: id: ")
    expect(error.cause).toBe(parsed.error)
  })
})
