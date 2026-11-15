export type Condition<V> = {
  eq?: V | undefined
  ne?: V | undefined
  in?: readonly V[] | undefined
  gt?: V | undefined
  gte?: V | undefined
  lt?: V | undefined
  lte?: V | undefined
  ieq?: V | undefined
}
