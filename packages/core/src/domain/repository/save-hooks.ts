export type SaveHooks = {
  before?: () => void | Promise<void>
} & (
  | { after?: undefined, guard?: string[] | undefined }
  | { after: () => void | Promise<void>, guard: string[] }
)
