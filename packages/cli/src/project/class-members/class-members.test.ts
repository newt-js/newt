import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { classMembers } from './class-members'

test('the members a class declares, and none of a class that is not there', () => {
  const code = 'export class A { readonly x = 1\n  async create(): Promise<void> {}\n  get y() { return 1 } }\nclass B { z = 1 }\n'
  expect(classMembers(code, 'A')).toEqual(['x', 'create', 'y'])
  expect(classMembers(code, 'C')).toEqual([])
})
