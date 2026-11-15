import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { keepingParams } from './keeping-params'

describe('keepingParams', () => {
  test('the copy gets the request\'s own params and cookies', () => {
    const request = new Request('http://shop.test/api/things/7')
    Object.defineProperty(request, 'params', { value: { id: '7' }, configurable: true })
    Object.defineProperty(request, 'cookies', { get: () => 'the cookies', configurable: true })

    const copy = keepingParams(request, new Request(request.url)) as Request & { params: unknown, cookies: unknown }

    expect(copy.params).toEqual({ id: '7' })
    expect(copy.cookies).toBe('the cookies')
  })

  test('a request without them leaves the copy as it was', () => {
    const copy = new Request('http://shop.test/')

    expect(keepingParams(new Request('http://shop.test/'), copy)).toBe(copy)
    expect(Object.getOwnPropertyDescriptor(copy, 'params')).toBeUndefined()
  })
})
