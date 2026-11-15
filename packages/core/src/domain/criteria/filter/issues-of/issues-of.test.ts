import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
import { z }        from 'zod'
// --------------------------------------------------------
import { issuesOf } from './issues-of'

describe('issuesOf', () => {
  test('each issue with its path joined by dots and its message', () => {
    const parsed = z.object({ and: z.array(z.object({ value: z.number() })) }).safeParse({ and: [{ value: 'x' }] })
    expect(issuesOf(parsed.error!)).toEqual([{ path: 'and.0.value', message: expect.any(String) }])
  })

  test('an issue on the whole input has an empty path', () => {
    const parsed = z.number().safeParse('x')
    expect(issuesOf(parsed.error!)[0]!.path).toBe('')
  })
})
