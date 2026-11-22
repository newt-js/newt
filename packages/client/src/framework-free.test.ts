import { Glob }   from 'bun'
import { expect } from 'bun:test'
import { test }   from 'bun:test'

const FRAMEWORKS = /from '(react|react-dom|preact|vue|@angular\/[^']+|svelte)(\/[^']*)?'/

test('imports no UI framework: each one reaches it through a package of its own', async () => {
  const offending: string[] = []
  for await (const file of new Glob('**/*.ts').scan(import.meta.dir)) {
    const text = await Bun.file(`${import.meta.dir}/${file}`).text()
    if (FRAMEWORKS.test(text) && !file.endsWith('framework-free.test.ts')) offending.push(file)
  }
  expect(offending).toEqual([])
})
