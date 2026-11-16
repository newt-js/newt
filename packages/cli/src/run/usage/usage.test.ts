import { expect }  from 'bun:test'
import { test }    from 'bun:test'
// --------------------------------------------------------
import { version } from '../version/version'
import { usage }   from './usage'

test('usage starts with the version and lists the options', async () => {
  const text = await usage()
  expect(text).toStartWith(`newt ${await version()}`)
  expect(text).toContain('-h, --help')
  expect(text).toContain('-v, --version')
})
