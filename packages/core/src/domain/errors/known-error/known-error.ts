export type ErrorParams = Record<string, unknown>

export abstract class KnownError<P extends ErrorParams = {}> extends Error {
  abstract readonly kind: string
  abstract readonly code: string
  readonly params: P

  constructor(message: string, params: P = {} as P) {
    super(message)
    this.name = new.target.name
    this.params = params
  }
}
