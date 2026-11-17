import { afterEach }   from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { terminalAsk } from './terminal-ask'

const original = globalThis.prompt

afterEach(() => {
  globalThis.prompt = original
})

test('an empty answer takes the suggested one', async () => {
  globalThis.prompt = () => ' '
  expect(await terminalAsk('Named?', 'my-app')).toBe('my-app')
})

test('the end of input cancels', async () => {
  globalThis.prompt = () => null
  await expect(terminalAsk('Named?', 'my-app')).rejects.toThrow('Cancelled: newt wrote nothing')
})
