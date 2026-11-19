import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { it }        from 'bun:test'
// --------------------------------------------------------
import { isPackage } from './is-package'

describe('isPackage', () => {
  it('says a path that does not start with a dot is a package', () => {
    expect(isPackage({ path: 'zod' })).toBe(true)
    expect(isPackage({ path: 'node:path' })).toBe(true)
    expect(isPackage({ path: './a' })).toBe(false)
    expect(isPackage({ path: '../a' })).toBe(false)
  })
})
