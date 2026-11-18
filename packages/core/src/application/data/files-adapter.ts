import type { StorageOptions } from '../../domain/file-storage/files/storage-options'
import type { DataPlace }      from './data-place/data-place'

/** A route that serves files: a request in, its answer out. */
type FilesRoute = (request: Request) => Response | Promise<Response>

/** What a files adapter needs of its context's router: its prefix, and adding the public routes that serve the files. */
export type FilesRouter = {
  readonly prefix: string
  get(path: string, route: FilesRoute, options: { public: true }): void
  put(path: string, route: FilesRoute, options: { public: true, maxBodyBytes: number }): void
}

/** How a context opens its files, `localFiles()` or `s3Files()`: given its name, its router, its own host if any, and where it keeps its data. */
export type FilesAdapter = {
  open(context: string, at: { router: FilesRouter, host: string | undefined, place: DataPlace }): Promise<StorageOptions>
}
