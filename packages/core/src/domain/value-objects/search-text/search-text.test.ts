import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { InvalidSearchText } from './invalid-search-text/invalid-search-text'
import { SearchText }        from './search-text'
import { searchTextFactory } from './search-text'

describe('SearchText', () => {
  test('is what someone typed, trimmed, maybe nothing', () => {
    expect(SearchText.from('  plan the launch ')).toBe('plan the launch' as SearchText)
    expect(SearchText.from('')).toBe('' as SearchText)
    expect(SearchText.schema.parse(' plan ')).toBe('plan' as SearchText)
  })

  test('refuses more than 100 characters, with a validation error', () => {
    expect(() => SearchText.from('x'.repeat(101))).toThrow(expect.objectContaining({ code: 'invalid_search_text', kind: 'validation' }))
  })
})

describe('searchTextFactory', () => {
  test('makes the search text value object: trimmed, or refused when too long', () => {
    const SearchText = searchTextFactory()

    expect(SearchText.from(' plan ') as string).toBe('plan')
    expect(() => SearchText.from('x'.repeat(101))).toThrow(InvalidSearchText)
  })
})
