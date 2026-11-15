import { StoredFile } from './stored-file'

export type OpenFile = StoredFile & { stream: ReadableStream<Uint8Array> }
