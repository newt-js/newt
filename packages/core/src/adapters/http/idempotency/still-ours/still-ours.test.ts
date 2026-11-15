import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { StaleVersion } from '../../../../domain/errors/stale-version/stale-version'
import { stillOurs }    from './still-ours'

describe('stillOurs', () => {
  test('writes', async () => {
    let written = false

    await stillOurs(async () => {
      written = true
    })

    expect(written).toBe(true)
  })

  test('a write someone else got to first is let go', async () => {
    await expect(stillOurs(() => Promise.reject(new StaleVersion()))).resolves.toBeUndefined()
  })

  test('any other failure is thrown', async () => {
    await expect(stillOurs(() => Promise.reject(new Error('down')))).rejects.toThrow('down')
  })
})
