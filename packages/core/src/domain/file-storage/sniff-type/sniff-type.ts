import { fitsSignature } from '../fits-signature/fits-signature'
import { ftypSignature } from '../ftyp-signature/ftyp-signature'
import { Signature }     from './signature'

const ZIP_BASED = ['application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']

const SIGNATURES: Signature[] = [
  { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], types: ['image/png'] },
  { bytes: [0xFF, 0xD8, 0xFF], types: ['image/jpeg'] },
  { bytes: [0x47, 0x49, 0x46, 0x38], types: ['image/gif'] },
  { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], types: ['image/webp'] },
  ftypSignature('avif', ['image/avif']),
  ...['heic', 'heix', 'heim', 'heis'].map(brand => ftypSignature(brand, ['image/heic'])),
  ...['mif1', 'msf1'].map(brand => ftypSignature(brand, ['image/heif', 'image/heic'])),
  ftypSignature('qt  ', ['video/quicktime']),
  ftypSignature('M4A ', ['audio/mp4', 'audio/x-m4a']),
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2D], types: ['application/pdf'] },
  { bytes: [0x50, 0x4B, 0x03, 0x04], types: ZIP_BASED },
  { bytes: [0x1F, 0x8B], types: ['application/gzip'] },
  ftypSignature('', ['video/mp4', 'audio/mp4']),
  { bytes: [0x1A, 0x45, 0xDF, 0xA3], types: ['video/webm', 'audio/webm'] },
  { bytes: [0x4D, 0x5A], types: ['application/vnd.microsoft.portable-executable'] },
  { bytes: [0x7F, 0x45, 0x4C, 0x46], types: ['application/x-elf'] },
]

const KNOWN = new Set(SIGNATURES.flatMap(signature => signature.types))

export const SNIFF_BYTES = 16

export function matchesType(head: Uint8Array, contentType: string): boolean {
  const type = contentType.split(';')[0]!.trim().toLowerCase()
  const found = SIGNATURES.find(signature => fitsSignature(head, signature))
  return found ? found.types.includes(type) : !KNOWN.has(type)
}
