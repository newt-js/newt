export type FindOptions<Row> = {
  orderBy?: { field: keyof Row & string, direction?: 'asc' | 'desc' | undefined }[] | undefined
  limit?: number | undefined
}
