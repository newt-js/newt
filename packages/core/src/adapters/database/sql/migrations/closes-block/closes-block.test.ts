import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { closesBlock } from './closes-block'

describe('closesBlock', () => {
  test('an END after a statement closes the open block', () => {
    expect(closesBlock(false, ';')).toBe(true)
    expect(closesBlock(true, 'x')).toBe(true)
  })

  test('an END where an operand is expected is a name, not the close of a block', () => {
    expect(['set', 'select', 'then', '=', ',', '('].map(previous => closesBlock(false, previous))).toEqual([false, false, false, false, false, false])
  })

  test('with no block open, nothing closes', () => {
    expect(closesBlock(undefined, ';')).toBe(false)
  })
})
