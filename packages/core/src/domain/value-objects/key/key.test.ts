import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { Key }        from './key'
import { keyFactory } from './key'

describe('Key', () => {
  test('is a string at runtime, but one of its kind only to the compiler', () => {
    const product = 'cooper' as Key<'ProductId'>
    // @ts-expect-error a ClientId is no ProductId
    const client: Key<'ClientId'> = product
    // @ts-expect-error a plain string is no ProductId
    const plain: Key<'ProductId'> = 'cooper'

    expect([client, plain] as string[]).toEqual(['cooper', 'cooper'])
  })
})

const ProductId = keyFactory('ProductId', /^[a-z][a-z0-9-]*$/)
type ProductId = Key<'ProductId'>
const ClientId = keyFactory('ClientId')

describe('keyFactory', () => {
  test('takes a key of its pattern', () => {
    expect(ProductId.from('cooper')).toBe('cooper' as ProductId)
    expect(ClientId.from('cooper-web:1')).toBe('cooper-web:1' as Key<'ClientId'>)
  })

  test('refuses anything else with a validation error that names its type', () => {
    for (const value of ['', 'Cooper', 'a b']) {
      expect(() => ProductId.from(value)).toThrow(expect.objectContaining({ code: 'invalid_key', kind: 'validation', params: { type: 'ProductId' } }))
    }
    expect(() => ClientId.from('x'.repeat(201))).toThrow(expect.objectContaining({ code: 'invalid_key' }))
  })
})
