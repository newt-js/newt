export function columnName(field: string): string {
  return field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}
