import { expect }  from 'bun:test'
import { test }    from 'bun:test'
// --------------------------------------------------------
import { version } from './version'

test("version is the package's", async () => {
  const { version: expected } = await Bun.file(new URL('../../package.json', import.meta.url)).json() as { version: string }
  expect(await version()).toBe(expected)
})
