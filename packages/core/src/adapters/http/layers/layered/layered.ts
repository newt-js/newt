import { HttpRoute } from '../../router/http-route'
import { Layer }     from '../layer'
import { Layering }  from '../layering'

export function layered(route: HttpRoute, layers: readonly Layer[], layering: Layering): HttpRoute {
  return layers.reduceRight((inner, layer) => layer.around(inner, layering), route)
}
