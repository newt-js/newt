import { Records }      from '../records/records'
import { Transactions } from '../transactions/transactions'

export type ContractRow = { id: string, version: number, name: string, size: number, tag: string | null }

export type RecordsWorld = { records: Records<ContractRow>, transactions: Transactions }

export type RecordsFixture = {
  serial?: boolean | undefined
  open(): Promise<RecordsWorld>
  close?(world: RecordsWorld): Promise<void>
}
