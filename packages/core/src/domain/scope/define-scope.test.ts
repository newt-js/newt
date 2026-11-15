import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { defineScope } from './define-scope'

describe('defineScope', () => {
  test('carries a value down to everything run in it, across awaits', async () => {
    const workspace = defineScope<{ id: string }>('workspace')
    const read = async () => {
      await Bun.sleep(1)
      return workspace.get()?.id
    }

    expect(await workspace.run({ id: 'w1' }, read)).toBe('w1')
    expect(workspace.run({ id: 'w2' }, () => workspace.get())).toEqual({ id: 'w2' })
  })

  test('has nothing outside it', () => {
    const workspace = defineScope<string>('workspace')

    expect(workspace.get()).toBeUndefined()
  })

  test('keeps scopes apart, each with its own value', () => {
    const one = defineScope<number>('one')
    const two = defineScope<number>('two')

    expect(one.run(1, () => two.run(2, () => [one.get(), two.get()]))).toEqual([1, 2])
  })
})
