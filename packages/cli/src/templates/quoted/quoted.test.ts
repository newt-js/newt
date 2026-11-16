import { expect } from 'bun:test'
import { test }   from 'bun:test'
// --------------------------------------------------------
import { quoted } from './quoted'

test('a literal that evaluates back to the text, whatever it holds', () => {
  for (const text of ["it's", 'a\\b', "x'+String(console.log('PWN'))+'", 'two\nlines', '${x}']) {
    expect(new Function(`return ${quoted(text)}`)()).toBe(text)
  }
})
