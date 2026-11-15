export function isNamePart(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}_$]/u.test(char)
}
