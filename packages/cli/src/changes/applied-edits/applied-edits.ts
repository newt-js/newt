export type TextEdit = { from: number, to: number, text: string }

/** `text` with each edit made, by the positions in the text as it was. */
export function appliedEdits(text: string, edits: TextEdit[]): string {
  return edits.toSorted((a, b) => b.from - a.from).reduce((edited, { from, to, text: inserted }) => `${edited.slice(0, from)}${inserted}${edited.slice(to)}`, text)
}
