import { closesBlock } from '../closes-block/closes-block'

const STATEMENT_BLOCKS = new Set(['if', 'loop', 'repeat', 'while'])

const STATEMENT_STARTS = new Set([';', ':', 'begin', 'atomic', 'then', 'else', 'do', 'loop', 'repeat'])

export function followBlocks(blocks: boolean[], word: string, previous: string): void {
  const startsStatement = STATEMENT_STARTS.has(previous) && !((previous === 'then' || previous === 'else') && blocks.at(-1))
  if (previous === 'end' && (word === 'case' || STATEMENT_BLOCKS.has(word))) return
  if (word === 'begin') blocks.push(false)
  else if (word === 'case') blocks.push(!startsStatement)
  else if (STATEMENT_BLOCKS.has(word) && startsStatement) blocks.push(false)
  else if (word === 'end' && closesBlock(blocks.at(-1), previous)) blocks.pop()
}
