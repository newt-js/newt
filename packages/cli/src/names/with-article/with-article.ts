/** `words` after a or an, by how they sound first: an order, a user, a utility, a euro, an hour. */
export function withArticle(words: string): string {
  return `${/^(?:a|e(?!u)|i|o(?!ne)|u(?!s|ni|ti|ri|ra|ro|ku)|h(?:our|onest))/.test(words) ? 'an' : 'a'} ${words}`
}
