export const escapeForRfc5987 = (char: string) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
