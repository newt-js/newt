import type { Database }  from '../database/database'
import type { DataPlace } from './data-place/data-place'

/** How a context opens its database, `sqlite()` or `postgres()`: given its name, its migrations and where it keeps its data. */
export type DatabaseAdapter = {
  open(context: string, migrations: string, place: DataPlace): Promise<Database>
}
