import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { foldingAToZ } from './folding-a-to-z'

describe('foldingAToZ', () => {
  test('compares the text by its bytes and lowers only A to Z, one REPLACE per letter', () => {
    const folded = foldingAToZ('name')
    expect(folded.startsWith('REPLACE('.repeat(26) + 'name COLLATE utf8mb4_0900_bin, \'A\', \'a\')')).toBe(true)
    expect(folded.endsWith(', \'Z\', \'z\')')).toBe(true)
    expect(folded.match(/REPLACE\(/g)).toHaveLength(26)
  })
})
