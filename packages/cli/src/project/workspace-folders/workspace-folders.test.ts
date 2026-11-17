import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdir }            from 'node:fs/promises'
import { join }             from 'node:path'
// --------------------------------------------------------
import { monorepoProject }  from '../../testing/monorepo-project/monorepo-project'
import { workspaceFolders } from './workspace-folders'

test("the folders its patterns take that have a package.json, sorted", async () => {
  const root = await monorepoProject(['packages/*', 'apps/*'])
  await Bun.write(join(root, 'apps/web/package.json'), '{}')
  await mkdir(join(root, 'apps/empty'), { recursive: true })
  expect(await workspaceFolders({ folder: root, patterns: ['packages/*', 'apps/*'], shape: 'list' })).toEqual([join(root, 'apps/web'), join(root, 'packages/utils')])
})
