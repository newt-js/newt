import { randomBytes } from 'node:crypto'

let lastMs = 0
let sequence = 0

export function uuidV7(): string {
  const bytes = randomBytes(16)
  const ms = Date.now()
  if (ms > lastMs) {
    lastMs = ms
    sequence = bytes.readUInt16BE(6) & 0x7ff
  } else if (sequence < 0xfff) {
    sequence++
  } else {
    lastMs++
    sequence = bytes.readUInt16BE(6) & 0x7ff
  }
  bytes.writeUIntBE(lastMs, 0, 6)
  bytes[6] = 0x70 | (sequence >> 8)
  bytes[7] = sequence & 0xff
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
