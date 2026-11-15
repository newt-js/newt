export type FilterLimits<Sortable extends string = never> = {
  sort?: readonly Sortable[]
  maxDepth?: number
  maxConditions?: number
}
