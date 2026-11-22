import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { pagesShown } from './pages-shown'

describe('pagesShown', () => {
  test('shows every page when there are few', () => {
    expect(pagesShown(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  test('skips the pages far from the current one', () => {
    expect(pagesShown(10, 20)).toEqual([1, null, 9, 10, 11, null, 20])
  })

  test('skips nothing beside the first and the last', () => {
    expect(pagesShown(1, 20)).toEqual([1, 2, null, 20])
    expect(pagesShown(20, 20)).toEqual([1, null, 19, 20])
  })
})
