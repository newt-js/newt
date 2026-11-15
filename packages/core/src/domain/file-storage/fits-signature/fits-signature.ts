import { Signature } from '../sniff-type/signature'

export const fitsSignature = (head: Uint8Array, { bytes, at = 0 }: Signature) =>
  bytes.every((byte, index) => byte === null || head[at + index] === byte)
