import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { ReferenceNotFound } from '../../errors/reference-not-found/reference-not-found'
import { referenced }        from './referenced'

type Product = { id: 'p1' | 'p2', name: string }

const products: Product[] = [{ id: 'p1', name: 'Agua' }, { id: 'p2', name: 'Pan' }]

describe('referenced', () => {
  test('gives the entity with that id, as it was given', () => {
    const product: Product = referenced(products, 'p2', 'product')

    expect(product).toBe(products[1]!)
  })

  test('an id none has is a ReferenceNotFound naming it, a validation error', () => {
    const missing = () => referenced(products, 'p9', 'product')

    expect(missing).toThrow(ReferenceNotFound)
    expect(missing).toThrow('The product p9 does not exist')
    try {
      missing()
    } catch (error) {
      expect(error).toMatchObject({ kind: 'validation', code: 'reference_not_found', params: { resource: 'product', id: 'p9' } })
    }
  })

  test('nothing given, nothing found', () => {
    expect(() => referenced([], 'c1', 'customer')).toThrow('The customer c1 does not exist')
  })
})
