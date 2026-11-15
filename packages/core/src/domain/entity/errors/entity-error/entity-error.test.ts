import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { EntityError } from './entity-error'

class Broken extends EntityError {}

describe('EntityError', () => {
  test('is a programming error named after its class', () => {
    const error = new Broken('it broke')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('Broken')
    expect(error.message).toBe('it broke')
  })
})
