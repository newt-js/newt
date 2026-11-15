import { ItemRow } from '../sql-database-fixture'

export function item(id: string, over: Partial<Omit<ItemRow, 'id' | 'version'>> = {}) {
  return { id, name: id, code: id, active: true, data: null, amount: null, ...over }
}
