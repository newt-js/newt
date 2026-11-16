import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { mkdtemp }           from 'node:fs/promises'
import { realpath }          from 'node:fs/promises'
import { tmpdir }            from 'node:os'
import { join }              from 'node:path'
// --------------------------------------------------------
import { monorepoProject }   from '../../testing/monorepo-project/monorepo-project'
import { findWorkspaceRoot } from './find-workspace-root'

describe('findWorkspaceRoot', () => {
  test('the root with its patterns, from the root or any folder inside', async () => {
    const root = await monorepoProject()
    const expected = { folder: root, patterns: ['packages/*'], shape: 'list' as const }
    expect(await findWorkspaceRoot(root)).toEqual(expected)
    expect(await findWorkspaceRoot(join(root, 'packages/utils'))).toEqual(expected)
  })

  test('workspaces given as an object of packages', async () => {
    const root = await monorepoProject({ packages: ['libs/*'] })
    expect(await findWorkspaceRoot(root)).toEqual({ folder: root, patterns: ['libs/*'], shape: 'packages' })
  })

  test('null where no package.json above has workspaces', async () => {
    const folder = await realpath(await mkdtemp(join(tmpdir(), 'newt-cli-root-')))
    await Bun.write(join(folder, 'package.json'), '{ "name": "alone" }')
    expect(await findWorkspaceRoot(folder)).toBeNull()
  })
})
