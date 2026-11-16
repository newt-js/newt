/** `words` after a or an, by how they start: an order, a user, an hour. */
export function withArticle(words: string): string {
  return `${/^(?:[aeio]|u(?!s|ni)|h(?:our|onest))/.test(words) ? 'an' : 'a'} ${words}`
}
