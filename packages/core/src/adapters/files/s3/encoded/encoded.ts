export const encoded = (text: string) =>
  encodeURIComponent(text).replace(/[!'()*]/g, sign => `%${sign.charCodeAt(0).toString(16).toUpperCase()}`)
