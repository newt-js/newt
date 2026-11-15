import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { PathPattern } from '../path-pattern/path-pattern'
import { paramsOf }    from './params-of'

describe('paramsOf', () => {
  test('each of the pattern\'s names with the value matched in its place', () => {
    expect(paramsOf(new PathPattern('/api/boards/:boardId/cards/:id'), ['b1', 'c7'])).toEqual({ boardId: 'b1', id: 'c7' })
  })

  test('a pattern with no names, no params', () => {
    expect(paramsOf(new PathPattern('/api/things'), [])).toEqual({})
  })
})
