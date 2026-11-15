import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { encoded }  from './encoded'

describe('encoded', () => {
  test('encodes the signs encodeURIComponent leaves, as S3 signs them', () => {
    expect(encoded("!'()*")).toBe('%21%27%28%29%2A')
  })

  test('encodes as encodeURIComponent does the rest, unreserved signs kept', () => {
    expect(encoded('a b/ñ+=&')).toBe('a%20b%2F%C3%B1%2B%3D%26')
    expect(encoded('A-z_0.9~')).toBe('A-z_0.9~')
  })
})
