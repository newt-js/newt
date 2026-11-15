import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { allowedBy } from './allowed-by'

const from = (origin?: string) => new Request('http://shop.test/api/cards', origin ? { headers: { origin } } : {})

describe('allowedBy', () => {
  test('an origin CORS lets in, or any when it says *', () => {
    expect(allowedBy({ origin: ['https://a.test'] }, from('https://a.test'))).toBe(true)
    expect(allowedBy({ origin: '*' }, from('https://b.test'))).toBe(true)
  })

  test('not another origin, nor a request without one, nor any without CORS', () => {
    expect(allowedBy({ origin: ['https://a.test'] }, from('https://b.test'))).toBe(false)
    expect(allowedBy({ origin: '*' }, from())).toBe(false)
    expect(allowedBy(undefined, from('https://a.test'))).toBe(false)
  })
})
