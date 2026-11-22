/** A page of a list, as newt's backend answers it: its items, the cursor of the next one and, sometimes, how many there are. */
export type Page<ITEM> = {
  items: ITEM[]
  nextCursor?: string | undefined
  total?: number | undefined
}
