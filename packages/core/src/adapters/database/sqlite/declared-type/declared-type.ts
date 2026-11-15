export const declaredType = (row: Record<string, unknown>) => String(row.type ?? '').toUpperCase()
