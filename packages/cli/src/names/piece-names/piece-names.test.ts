import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { pieceNames } from './piece-names'

test("a piece's names from its file's", () => {
  expect(pieceNames('price-changed', 'an event')).toEqual({ folder: 'price-changed', camel: 'priceChanged', type: 'PriceChanged', words: 'price changed' })
})

test('refuses a name that is not lowercase words joined by -, saying what it names', () => {
  expect(() => pieceNames('Shipped', 'an event')).toThrow("'Shipped' cannot name an event")
})
