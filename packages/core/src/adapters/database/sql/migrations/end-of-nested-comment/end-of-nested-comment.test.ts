import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { endOfNestedComment } from './end-of-nested-comment'

describe('endOfNestedComment', () => {
  test('ends just past the close of a comment with none inside', () => {
    expect(endOfNestedComment('/* a */ b', 2)).toBe(7)
  })

  test('a comment opened inside must close before the outer one does', () => {
    const sql = '/* a /* b */ c */ d'

    expect(endOfNestedComment(sql, 2)).toBe(17)
  })

  test('a comment left open runs to the end of the text', () => {
    expect(endOfNestedComment('/* a /* b */ c', 2)).toBe(14)
  })
})
