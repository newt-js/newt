import { Database } from '../database'

export type DatabaseFixture = {
  open(): Promise<Database>
  close?(database: Database): Promise<void>
}
