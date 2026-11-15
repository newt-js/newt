import { Ref }      from './ref'
import { RefQuery } from './ref-query'

export interface RefFinder {
  find(criteria: RefQuery): Promise<Ref[]>
}
