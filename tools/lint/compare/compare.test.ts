import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { it }       from 'bun:test'
// --------------------------------------------------------
import { compare }  from './compare'

const line = (path: string, name: string) => ({ path, name })

describe('compare', () => {
  it('sorts packages before local files', () => {
    expect(compare(line('zod', 'z'), line('./a', 'a'))).toBeLessThan(0)
  })

  it('sorts local files that climb more folders first', () => {
    expect(compare(line('../../c', 'c'), line('./a', 'a'))).toBeLessThan(0)
    expect(compare(line('./a', 'a'), line('../b', 'b'))).toBeGreaterThan(0)
  })

  it('sorts by path, then by name', () => {
    expect(compare(line('./a', 'z'), line('./b', 'a'))).toBeLessThan(0)
    expect(compare(line('./a', 'b'), line('./a', 'a'))).toBeGreaterThan(0)
    expect(compare(line('./a', 'a'), line('./a', 'a'))).toBe(0)
  })
})
