import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { endOfLine } from './end-of-line'

test('past what follows a node on its line: a comma, a comment', () => {
  expect(endOfLine('a // why\nb', 1)).toEqual({ at: 8, comma: false })
  expect(endOfLine('a, /* why */\nb', 1)).toEqual({ at: 12, comma: true })
  expect(endOfLine('a\nb', 1)).toEqual({ at: 1, comma: false })
})

test('right after the node, and its comma, when code follows on its line', () => {
  expect(endOfLine('a, c }', 1)).toEqual({ at: 2, comma: true })
  expect(endOfLine('a }', 1)).toEqual({ at: 1, comma: false })
})
