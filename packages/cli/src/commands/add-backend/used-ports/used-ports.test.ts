import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { join }            from 'node:path'
// --------------------------------------------------------
import { monorepoProject } from '../../../testing/monorepo-project/monorepo-project'
import { usedPorts }       from './used-ports'

test("the ports in the workspaces' .env and .env.example, with the workspace of each", async () => {
  const root = await monorepoProject(['apps/*', 'packages/*'])
  await Bun.write(join(root, 'apps/api/.env'), 'PORT=3000\nVALKEY_URL=redis://localhost:6379\n')
  await Bun.write(join(root, 'apps/web/.env.example'), 'PORT=3010\n')
  await Bun.write(join(root, 'apps/docs/.env'), 'TITLE=docs\n')
  expect(await usedPorts({ folder: root, patterns: ['apps/*', 'packages/*'], shape: 'list' })).toEqual(new Map([[3000, 'apps/api'], [3010, 'apps/web']]))
})

test('none in a monorepo without .env files', async () => {
  const root = await monorepoProject()
  expect((await usedPorts({ folder: root, patterns: ['packages/*'], shape: 'list' })).size).toBe(0)
})
