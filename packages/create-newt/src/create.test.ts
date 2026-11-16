import { expect }   from 'bun:test'
import { test }     from 'bun:test'
import { mkdtemp }  from 'node:fs/promises'
import { realpath } from 'node:fs/promises'
import { tmpdir }   from 'node:os'
import { dirname }  from 'node:path'
import { join }     from 'node:path'

const CREATE = join(import.meta.dir, 'create.ts')

async function create(args: string[]) {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'create-newt-')))
  const child = Bun.spawn([process.execPath, CREATE, ...args], { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { cwd, code, stdout, stderr }
}

test('creates a backend in a folder of the name given, as newt init does', async () => {
  const { cwd, code, stdout } = await create(['shop'])
  expect(code).toBe(0)
  expect(stdout).toContain('created  shop/package.json')
  expect((await Bun.file(join(cwd, 'shop/package.json')).json()).name).toBe('shop')
})

test('passes on what it is given: a monorepo', async () => {
  const { cwd } = await create(['acme', '--monorepo'])
  expect(await Bun.file(join(cwd, 'acme/apps/api/package.json')).exists()).toBe(true)
})

test('without a name nor a terminal, says how to give it', async () => {
  const { code, stderr } = await create([])
  expect(code).toBe(1)
  expect(stderr).toContain("newt init needs the project's name")
})

test('its bin runs it with Bun from Node, and without Bun says how to install it', async () => {
  const node = Bun.which('node')
  if (!node) return
  const bin = join(import.meta.dir, 'create-newt.js')
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'create-newt-')))
  const withBun = Bun.spawnSync([node, bin, 'shop'], { cwd, env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
  expect(withBun.exitCode).toBe(0)
  expect(await Bun.file(join(cwd, 'shop/package.json')).exists()).toBe(true)
  const withoutBun = Bun.spawnSync([node, bin, 'shop'], { cwd, env: { PATH: dirname(node) } })
  expect(withoutBun.exitCode).toBe(1)
  expect(withoutBun.stderr.toString()).toContain('https://bun.sh')
})
