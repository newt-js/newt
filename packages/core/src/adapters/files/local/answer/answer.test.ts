import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { NEVER_RUNS } from './answer'
import { answer }     from './answer'

describe('answer', () => {
  test('answers with the status and no body', async () => {
    const response = answer(404)

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('')
  })

  test('says what it answers never runs: no sniffing, sandboxed', () => {
    const response = answer(403)

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toBe("sandbox; default-src 'none'")
    expect(Object.fromEntries(response.headers)).toEqual(NEVER_RUNS)
  })
})
