import { ApiError }         from './api-error'
import type { ErrorBody }   from './error-body'
import { issuesOf }         from './field-issue'
import type { QueryParams } from './query-params'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * What every API client shares: the base URL, query params, JSON in and out, and a failed answer turned into
 * an `ApiError`. A client only says its `path` and which requests it makes.
 */
export abstract class Requester {

  /** Where every client's path starts: the app sets its context's API (`/backoffice/api`) when it starts. */
  static baseUrl = '/api'

  /** Called when the backend says there is no session (401), wherever the request came from. */
  static onUnauthorized: (() => void) | null = null

  /** Called when the backend refuses a request (403), wherever it came from. */
  static onForbidden: ((error: ApiError) => void) | null = null

  /** The client's part of the URL, after the base: `/clients`. */
  protected abstract readonly path: string

  protected get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.call<T>('GET', path, undefined, params)
  }

  /** With `headers` of its own, such as an `Idempotency-Key`. */
  protected post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.call<T>('POST', path, body, undefined, headers)
  }

  protected put<T>(path: string, body?: unknown): Promise<T> {
    return this.call<T>('PUT', path, body)
  }

  protected patch<T>(path: string, body?: unknown): Promise<T> {
    return this.call<T>('PATCH', path, body)
  }

  protected delete<T>(path: string): Promise<T> {
    return this.call<T>('DELETE', path)
  }

  private async call<T>(method: Method, path: string, body?: unknown, params?: QueryParams, headers?: Record<string, string>): Promise<T> {
    const hasBody = body !== undefined
    let response: Response
    try {
      response = await fetch(this.url(path, params), {
        method,
        headers: { ...hasBody ? { 'content-type': 'application/json' } : {}, ...headers },
        ...hasBody ? { body: JSON.stringify(body) } : {},
        credentials: 'include',
      })
    } catch (error) {
      throw new ApiError(0, error instanceof Error ? error.message : 'Request failed')
    }
    if (!response.ok) throw await this.failure(response)
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  private async failure(response: Response): Promise<ApiError> {
    if (response.status === 401) Requester.onUnauthorized?.()
    const body = await response.json().catch(() => null) as Partial<ErrorBody> | null
    const message = body?.error || response.statusText || `Request failed (${response.status})`
    const error = new ApiError(response.status, message, body?.code, issuesOf(body))
    if (response.status === 403) Requester.onForbidden?.(error)
    return error
  }

  private url(path: string, params?: QueryParams): string {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined) query.set(key, String(value))
    const search = query.size ? `?${query}` : ''
    return `${Requester.baseUrl}${this.path}${path}${search}`
  }
}
