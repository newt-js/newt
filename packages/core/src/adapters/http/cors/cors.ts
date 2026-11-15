export type Cors = {
  origin: '*' | string[]
  headers?: string[]
  expose?: string[]
  maxAge?: number
}
