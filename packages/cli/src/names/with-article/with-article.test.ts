import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { withArticle } from './with-article'

test('a or an, by how the words start', () => {
  expect(['order', 'invoice', 'user', 'price change', 'hour', 'umbrella', 'unit'].map(withArticle))
    .toEqual(['an order', 'an invoice', 'a user', 'a price change', 'an hour', 'an umbrella', 'a unit'])
})
