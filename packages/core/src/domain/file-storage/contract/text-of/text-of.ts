export const textOf = (bytes: Uint8Array | null) => (bytes ? new TextDecoder().decode(bytes) : null)
