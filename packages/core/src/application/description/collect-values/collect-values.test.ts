import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { collectValues } from './collect-values'

describe('collectValues', () => {
  test('gives every value however deep plain objects hold it', () => {
    const found: unknown[] = []
    const inner = { b: 2 }

    collectValues({ a: 1, inner }, value => found.push(value))

    expect(found).toEqual([1, inner, 2])
  })

  test('does not go inside arrays or class instances, and stops at a loop', () => {
    const found: unknown[] = []
    const loop: Record<string, unknown> = { a: 1 }
    loop.self = loop
    const list = [3]

    collectValues({ loop, list }, value => found.push(value))

    expect(found).toEqual([loop, 1, loop, list])
  })
})
