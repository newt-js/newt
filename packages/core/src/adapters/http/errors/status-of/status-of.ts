const STATUSES: Record<string, number> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  too_large: 413,
  unsupported_media_type: 415,
  unprocessable: 422,
  too_many_requests: 429,
}

export function statusOf(kind: string): number | null {
  return STATUSES[kind] ?? null
}
