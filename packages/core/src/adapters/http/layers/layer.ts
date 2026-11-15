import { HttpRoute } from '../router/http-route'
import { Layering }  from './layering'

export type Layer = { name: string, around: (route: HttpRoute, layering: Layering) => HttpRoute }
