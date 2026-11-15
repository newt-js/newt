import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { followBlocks } from './follow-blocks'

describe('followBlocks', () => {
  test('a BEGIN opens a block and an END after a statement closes it', () => {
    const blocks: boolean[] = []

    followBlocks(blocks, 'begin', 'as')
    expect(blocks).toEqual([false])

    followBlocks(blocks, 'end', ';')
    expect(blocks).toEqual([])
  })

  test('an IF, LOOP, REPEAT or WHILE opens a block only where a statement starts', () => {
    const atStart: boolean[] = []
    const inside: boolean[] = []

    followBlocks(atStart, 'if', ';')
    followBlocks(inside, 'if', 'select')

    expect(atStart).toEqual([false])
    expect(inside).toEqual([])
  })

  test('a CASE inside an expression opens an expression block, one at a statement start a statement block', () => {
    const expression: boolean[] = []
    const statement: boolean[] = []

    followBlocks(expression, 'case', 'select')
    followBlocks(statement, 'case', ';')

    expect(expression).toEqual([true])
    expect(statement).toEqual([false])
  })

  test('a THEN inside an expression CASE starts no statement', () => {
    const blocks = [true]

    followBlocks(blocks, 'if', 'then')

    expect(blocks).toEqual([true])
  })

  test('the word after END IF, END LOOP or END CASE opens nothing', () => {
    const blocks: boolean[] = []

    followBlocks(blocks, 'if', 'end')
    followBlocks(blocks, 'case', 'end')

    expect(blocks).toEqual([])
  })

  test('an END where an operand is expected leaves the block open', () => {
    const blocks = [false]

    followBlocks(blocks, 'end', '=')

    expect(blocks).toEqual([false])
  })
})
