import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { envValues } from './env-values'

test('the values of each line, however it is written', () => {
  const text = 'PORT=3000 # api\nA="x y"\nexport B=\'2\'\n# C=3\n  D = 4\nE=\n'
  expect(Object.fromEntries(envValues(text))).toEqual({ PORT: '3000', A: 'x y', B: '2', D: '4', E: '' })
})
