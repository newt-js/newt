import type { Signature } from '../sniff-type/signature'

export const ftypSignature = (brand: string, types: string[]): Signature => ({ bytes: [...`ftyp${brand}`].map(char => char.charCodeAt(0)), at: 4, types })
