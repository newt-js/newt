import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { inlineScriptHashes } from './inline-script-hashes'

const hashOf = (script: string) => `'sha256-${new Bun.CryptoHasher('sha256').update(script).digest('base64')}'`

describe('inlineScriptHashes', () => {
  test('is the hash of each inline script, as it is written between its tags', () => {
    expect(inlineScriptHashes('<head><script>one()</script><SCRIPT type="module">\n  two()\n</SCRIPT></head>')).toEqual([hashOf('one()'), hashOf('\n  two()\n')])
  })

  test('leaves out a script loaded by its src, and one with nothing in it', () => {
    expect(inlineScriptHashes('<script src="/chunk.js"></script><script type="module" crossorigin src=\'/a.js\'></script><script>  </script><script></script>')).toEqual([])
  })

  test('hashes an inline script whose attributes only end in src, as data-src', () => {
    expect(inlineScriptHashes('<script data-src="/later.js">inline()</script>')).toEqual([hashOf('inline()')])
    expect(inlineScriptHashes('<script type="module"\n  src="/chunk.js"></script>')).toEqual([])
  })
})
