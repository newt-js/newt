export function lowerAscii(text: string): string {
  return text.replace(/[A-Z]/g, letter => letter.toLowerCase())
}
