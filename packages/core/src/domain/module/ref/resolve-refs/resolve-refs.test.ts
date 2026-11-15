import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { ReferenceNotFound } from '../../../errors/reference-not-found/reference-not-found'
import { RefFinder }         from '../ref-finder'
import { resolveRefs }       from './resolve-refs'

const catalogue = (...names: string[]): RefFinder => ({
  async find({ id }) {
    return names.filter(name => id.includes(name)).map(name => ({ id: name, name: name.toUpperCase() }))
  },
})

const finders = {
  city: catalogue('malaga', 'girona'),
  country: catalogue('es'),
}

const refs = (ids: Partial<Record<'city' | 'country', string | null | undefined>>) => resolveRefs(ids, finders)

describe('resolveRefs', () => {
  test('an id becomes the reference it names', async () => {
    expect(await refs({ city: 'malaga' })).toEqual({
      city: { id: 'malaga', name: 'MALAGA' },
    })
  })

  test('null means "no city" and resolves to null', async () => {
    expect(await refs({ city: null })).toEqual({ city: null })
  })

  test('an absent key is absent from the result', async () => {
    const resolved = await refs({ city: undefined, country: 'es' })

    expect('city' in resolved).toBe(false)
    expect(resolved).toEqual({ country: { id: 'es', name: 'ES' } })
  })

  test('resolves several at once', async () => {
    expect(await refs({ city: 'girona', country: 'es' })).toEqual({
      city: { id: 'girona', name: 'GIRONA' },
      country: { id: 'es', name: 'ES' },
    })
  })

  test('an id that points nowhere is a validation error naming the field', async () => {
    const failure = refs({ city: 'cuenca' })

    await expect(failure).rejects.toThrow(ReferenceNotFound)
    await expect(failure).rejects.toThrow('The city cuenca does not exist')
    await expect(failure.catch((e: ReferenceNotFound) => e.kind)).resolves.toBe('validation')
  })
})
