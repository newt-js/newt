export function codePointRank(unit: number): number {
  if (unit < 0xd800) {
    return unit
  }
  return unit >= 0xe000 ? unit - 0x800 : unit + 0x2000
}
