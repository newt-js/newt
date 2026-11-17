import type { Ref }      from './ref'
import type { RefQuery } from './ref-query'

export interface RefFinder {
  find(criteria: RefQuery): Promise<Ref[]>
}
