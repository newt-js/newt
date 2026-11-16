import { MalformedBody }        from '../../errors/malformed-body/malformed-body'
import { PayloadTooLarge }      from '../../errors/payload-too-large/payload-too-large'
import { toErrorResponse }      from '../../errors/to-error-response/to-error-response'
import { UnsupportedMediaType } from '../../errors/unsupported-media-type/unsupported-media-type'
import type { HttpRequest }     from '../../request/http-request'
import type { ErrorHandler }    from '../../router/http-route'
import type { HttpRoute }       from '../../router/http-route'
import { isJson }               from '../is-json/is-json'
import { limitBody }            from '../limit-body/limit-body'

export function handle(route: HttpRoute, onError: ErrorHandler = toErrorResponse, maxBodyBytes?: number) {
  return async (request: HttpRequest): Promise<Response> => {
    try {
      if (maxBodyBytes !== undefined) {
        limitBody(request, maxBodyBytes)
      }
      const json = request.json.bind(request)
      const formData = request.formData.bind(request)
      Object.defineProperty(request, 'json', {
        value: async () => {
          if (!isJson(request.headers.get('content-type'))) {
            throw new UnsupportedMediaType()
          }
          return json().catch(error => {
            throw error instanceof SyntaxError ? new MalformedBody(error) : error
          })
        },
        configurable: true,
      })
      Object.defineProperty(request, 'formData', {
        value: async () => {
          if (request.bodyUsed) {
            return formData()
          }
          return formData().catch(error => {
            throw error instanceof PayloadTooLarge ? error : new MalformedBody(error)
          })
        },
        configurable: true,
      })
      return await route(request)
    } catch (error) {
      return onError(error, request)
    }
  }
}
