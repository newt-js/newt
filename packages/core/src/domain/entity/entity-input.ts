export type EntityInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string, createdAt?: string, updatedAt?: string, version?: number }
