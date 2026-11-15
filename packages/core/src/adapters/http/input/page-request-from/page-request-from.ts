import { PageRequest } from '../../../../domain/pagination/page-request'

const DEFAULT_SIZE = 20
const MAX_SIZE = 100

export function pageRequestFrom(request: Request): PageRequest {
  const params = new URL(request.url).searchParams
  const size = Number.parseInt(params.get('size') ?? '', 10)
  const cursor = params.get('cursor') || undefined
  return { size: Number.isFinite(size) ? Math.min(MAX_SIZE, Math.max(1, size)) : DEFAULT_SIZE, cursor }
}
