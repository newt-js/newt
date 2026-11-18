/** What runContexts tells serve of its contexts. */
export type ServedContexts = {
  /** The contexts with a router, each answering its own /<context>/health-check. */
  health: string[]
  /** Each context's host, the context it is of. */
  hosts: Record<string, string>
}
