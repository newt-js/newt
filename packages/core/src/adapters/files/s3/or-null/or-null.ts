import { isMissing } from '../is-missing/is-missing'

export const orNull = <T>(read: Promise<T>): Promise<T | null> =>
  read.catch((error: unknown) => {
    if (isMissing(error)) {
      return null
    }
    throw error
  })
