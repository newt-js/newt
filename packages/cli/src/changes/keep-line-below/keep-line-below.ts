import type { KeepLineBelowChange } from '../../commands/command'
import type { ChangeOutcome }       from '../change-outcome'
import type { VirtualFiles }        from '../virtual-files/virtual-files'

/** Moves the line that starts with `line` just below the one that starts with `below`, when it is above it. */
export async function keepLineBelow({ path, line, below }: KeepLineBelowChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const lines = (await files.read(path))?.split('\n') ?? []
  const moving = lines.findIndex(each => each.startsWith(line))
  const anchor = lines.findIndex(each => each.startsWith(below))
  if (moving === -1 || anchor === -1) {
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} is not as newt wrote it: keep the line that starts with '${line.trim()}' below the one that starts with '${below.trim()}'`] }
  }
  if (moving > anchor) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const [moved] = lines.splice(moving, 1)
  lines.splice(anchor, 0, moved!)
  await files.write(path, lines.join('\n'))
  return { status: 'updated', warnings: [] }
}
