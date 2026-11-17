/** Where to add a line after a node that ends at `at`: past a comma and a comment that follow it on its line. */
export function endOfLine(text: string, at: number): { at: number, comma: boolean } {
  const rest = /^([ \t]*,)?([ \t]*(\/\/[^\n]*|\/\*[^\n]*?\*\/))?[ \t]*(?=\n|$)/.exec(text.slice(at))
  if (!rest) {
    const comma = /^[ \t]*,/.exec(text.slice(at))
    return { at: at + (comma?.[0].length ?? 0), comma: comma !== null }
  }
  return { at: at + rest[0].length, comma: rest[1] !== undefined }
}
