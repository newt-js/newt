import type { ContractRow } from '../records-fixture'

export const row = (id: string, over: Partial<Omit<ContractRow, 'id' | 'version'>> = {}) => ({ id, name: id, size: 1, tag: null, ...over })
