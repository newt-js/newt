export function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(/<script\b(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]!)
    .filter(script => script.trim().length > 0)
    .map(script => `'sha256-${new Bun.CryptoHasher('sha256').update(script).digest('base64')}'`)
}
