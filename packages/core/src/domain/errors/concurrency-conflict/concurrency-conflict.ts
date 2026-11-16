import { ConflictError }    from '../conflict-error/conflict-error'
import type { ErrorParams } from '../known-error/known-error'

export abstract class ConcurrencyConflict<P extends ErrorParams = {}> extends ConflictError<P> {}
