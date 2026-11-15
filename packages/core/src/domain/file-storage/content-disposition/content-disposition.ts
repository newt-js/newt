import { escapeForRfc5987 } from '../escape-for-rfc5987/escape-for-rfc5987'

const SHOWN_AS_THEY_ARE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'application/pdf'])

export function mayShowInline(contentType: string): boolean {
  return SHOWN_AS_THEY_ARE.has(contentType.split(';')[0]!.trim().toLowerCase())
}

export function contentDisposition(contentType: string, disposition: 'attachment' | 'inline' = 'attachment', filename?: string): string {
  const shown = disposition === 'inline' && mayShowInline(contentType) ? 'inline' : 'attachment'
  if (filename === undefined) {
    return shown
  }
  const plain = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  return `${shown}; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, escapeForRfc5987)}`
}
