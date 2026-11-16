import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdtempSync }   from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { virtualFiles }  from '../virtual-files/virtual-files'
import { keepLineBelow } from './keep-line-below'

const CHANGE = { action: 'keep-line-below' as const, path: 'f.ts', line: '  const order =', below: '  const invoice =' }

async function edited(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-below-'))
  await Bun.write(join(cwd, 'f.ts'), content)
  await keepLineBelow(CHANGE, virtualFiles(cwd, false))
  return Bun.file(join(cwd, 'f.ts')).text()
}

describe('keepLineBelow', () => {
  test('moves the line just below the other when it is above it', async () => {
    expect(await edited('  const order = o(invoice)\n  const user = u()\n  const invoice = i()\n')).toBe('  const user = u()\n  const invoice = i()\n  const order = o(invoice)\n')
  })

  test('leaves it where it is when it is below already', async () => {
    const text = '  const invoice = i()\n  const order = o(invoice)\n'
    expect(await edited(text)).toBe(text)
  })
})
