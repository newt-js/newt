import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { NotFoundError } from '../../../errors/not-found-error/not-found-error'
import { resolve }       from './resolve'

class CardNotFound extends NotFoundError {
  readonly code = 'card_not_found'
}

describe('resolve', () => {
  test('is the first row found', async () => {
    expect(await resolve(async () => ['a', 'b'], () => new CardNotFound('no card'))).toBe('a')
  })

  test('throws the error the caller gives when there is none', async () => {
    await expect(resolve(async () => [], () => new CardNotFound('no card'))).rejects.toBeInstanceOf(CardNotFound)
  })
})
