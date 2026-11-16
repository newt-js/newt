import type { HttpRoute } from '../../router/http-route'
import type { Layer }     from '../layer'
import type { Layering }  from '../layering'

export function layered(route: HttpRoute, layers: readonly Layer[], layering: Layering): HttpRoute {
  return layers.reduceRight((inner, layer) => layer.around(inner, layering), route)
}
