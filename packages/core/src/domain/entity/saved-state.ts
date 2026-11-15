export type SavedState = {
  readonly version: number
  readonly isNew: boolean
  readonly initial: unknown
  readonly deletion: 'none' | 'pending' | 'saved'
}
