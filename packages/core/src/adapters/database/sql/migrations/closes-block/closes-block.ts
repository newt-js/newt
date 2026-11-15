const BEFORE_OPERAND = new Set(['set', 'select', 'when', 'then', 'else', 'and', 'or', 'not', 'is', 'in', 'like', 'by', 'where', 'on', 'return', 'values', ',', '(', '=', '<', '>', '+', '-', '*', '/', '|', '%'])

export function closesBlock(block: boolean | undefined, previous: string): boolean {
  return block !== undefined && !BEFORE_OPERAND.has(previous)
}
