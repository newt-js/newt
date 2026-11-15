import { KnownError } from '../../../errors/known-error/known-error'

export async function resolve<T>(find: () => Promise<T[]>, onMissing: () => KnownError): Promise<T> {
  const [first] = await find()
  if (!first) {
    throw onMissing()
  }
  return first
}
