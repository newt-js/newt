export const unstorable = (text: string) => text.includes('\u0000') || !text.isWellFormed()
