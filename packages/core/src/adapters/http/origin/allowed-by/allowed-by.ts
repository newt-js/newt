import type { Cors } from '../../cors/cors'

export function allowedBy(cors: Cors | undefined, request: Request): boolean {
  const origin = request.headers.get('origin')
  return Boolean(cors && origin && (cors.origin === '*' || cors.origin.includes(origin)))
}
