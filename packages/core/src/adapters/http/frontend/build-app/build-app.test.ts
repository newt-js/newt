import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
import { mkdtemp }  from 'node:fs/promises'
import { readdir }  from 'node:fs/promises'
import { rm }       from 'node:fs/promises'
import { tmpdir }   from 'node:os'
import { join }     from 'node:path'
// --------------------------------------------------------
import { buildApp } from './build-app'

/** An app with a page it imports lazily, a font its CSS names, and a public folder. */
async function sourceApp(): Promise<string> {
  const source = await mkdtemp(join(tmpdir(), 'newt-source-app-'))
  await Bun.write(join(source, 'index.html'), '<!doctype html><link rel="stylesheet" href="./app.css"><script type="module" src="./main.ts"></script>')
  await Bun.write(join(source, 'main.ts'), "if (process.env.NODE_ENV !== 'production') console.log('dev only')\nvoid import('./page').then(({ page }) => page())\n")
  await Bun.write(join(source, 'page.ts'), "export const page = () => console.log('the lazy page')\n")
  await Bun.write(join(source, 'app.css'), '@font-face { font-family: Own; src: url(./own.woff2) format("woff2") }\nbody { font-family: Own }\n')
  await Bun.write(join(source, 'own.woff2'), new Uint8Array(2048).fill(7))
  await Bun.write(join(source, 'public', 'icon.svg'), '<svg/>')
  return source
}

describe('buildApp', () => {
  test('splits the lazy page into a chunk of its own, for production, with its fonts and its public folder beside it', async () => {
    const source = await sourceApp()
    const folder = await buildApp({ index: join(source, 'index.html') } as Bun.HTMLBundle, '/notes', join(source, 'public'))
    const files = await readdir(folder)
    const scripts = await Promise.all(files.filter(file => file.endsWith('.js')).map(file => Bun.file(join(folder, file)).text()))
    const css = await Bun.file(join(folder, files.find(file => file.endsWith('.css'))!)).text()

    expect(scripts.length).toBe(2)
    expect(scripts.filter(script => script.includes('the lazy page')).length).toBe(1)
    expect(scripts.join('')).not.toContain('dev only')
    expect(await Bun.file(join(folder, 'index.html')).text()).toContain('src="/notes/')
    expect(css).not.toContain('data:font')
    expect(css).toMatch(/url\(\.\/font-\w+\.woff2\)/)
    expect(files.filter(file => /^font-\w+\.woff2$/.test(file)).length).toBe(1)
    expect(files).toContain('icon.svg')
    await rm(source, { recursive: true })
    await rm(folder, { recursive: true })
  })

  test('an app that does not build says which, at its prefix', async () => {
    const source = await mkdtemp(join(tmpdir(), 'newt-source-app-'))
    await Bun.write(join(source, 'index.html'), '<script type="module" src="./missing.ts"></script>')

    await expect(buildApp({ index: join(source, 'index.html') } as Bun.HTMLBundle, '/notes')).rejects.toThrow('The app at /notes did not build: ')
    await rm(source, { recursive: true })
  })
})
