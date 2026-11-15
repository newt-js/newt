import { Clock } from '../../../domain/clock/clock'

export type LocalStorageOptions = {
  folder: string
  baseUrl: string
  secret: string
  clock?: Clock | undefined
}
