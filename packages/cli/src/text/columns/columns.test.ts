import { expect }  from 'bun:test'
import { test }    from 'bun:test'
// --------------------------------------------------------
import { columns } from './columns'

test('columns aligns the right column after the longest left one', () => {
  expect(columns([['a', 'first'], ['abc', 'second']])).toEqual(['  a    first', '  abc  second'])
})

test('columns of nothing is nothing', () => {
  expect(columns([])).toEqual([])
})
