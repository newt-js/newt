/** The first of the ways to write some code whose lines all fit in 80 columns; the last when none does. */
export function fitting(...ways: string[]): string {
  return ways.find(way => way.split('\n').every(line => line.length <= 80)) ?? ways.at(-1)!
}

/** A call on one line when it fits in 80 columns; else each argument on a line of its own. */
export function fittedCall(indent: string, head: string, args: string[], tail = ''): string {
  const line = `${indent}${head}(${args.join(', ')})${tail}`
  if (line.length <= 80) {
    return line
  }
  const each = args.map(arg => `${indent}  ${arg},`).join('\n')
  return `${indent}${head}(\n${each}\n${indent})${tail}`
}
