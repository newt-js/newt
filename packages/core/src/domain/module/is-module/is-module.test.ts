import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { MODULE_BRAND } from './is-module'
import { isModule }     from './is-module'

describe('isModule', () => {
  test('sees the brand, whichever copy of the framework made it', () => {
    expect(isModule({ name: 'order', [MODULE_BRAND]: true })).toBe(true)
    expect(isModule({ name: 'order', [Symbol.for('@newt-js/core/module')]: true })).toBe(true)
  })

  test('is false for anything without it', () => {
    expect(isModule({ name: 'order' })).toBe(false)
    expect(isModule(null)).toBe(false)
  })
})
