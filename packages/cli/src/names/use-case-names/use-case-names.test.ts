import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { useCaseNames } from './use-case-names'

test('the names of a use case', () => {
  expect(useCaseNames('mark-paid')).toEqual({ folder: 'mark-paid', camel: 'markPaid', type: 'MarkPaid', words: 'mark paid' })
})

test('never a name a module or JavaScript keeps', () => {
  for (const name of ['on', 'deps', 'events', 'name', 'delete']) {
    expect(() => useCaseNames(name)).toThrow(`'${name}' cannot name a use case`)
  }
})
