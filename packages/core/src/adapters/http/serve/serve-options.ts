import { ContentSecurityPolicy } from '../frontend/content-security-policy'
import { HttpRouter }            from '../router/http-router/http-router'
import { Hsts }                  from './security-headers'
import { SecurityHeaders }       from './security-headers'

export type FrontendMount = {
  path: string
  app: string | Bun.HTMLBundle
  publicFolder?: string
}

export type ServeOptions = {
  port: number
  routers?: HttpRouter[]
  routes?: Bun.Serve.Routes<undefined, string>
  frontend?: string | Bun.HTMLBundle | FrontendMount[]
  publicFolder?: string
  proxy?: Record<string, string>
  development?: boolean
  health?: boolean | string
  drainMs?: number
  trustProxy?: number
  securityHeaders?: SecurityHeaders | false
  hsts?: Hsts | boolean
  csp?: ContentSecurityPolicy | false
  maxBodyBytes?: number
  idleTimeoutSeconds?: number
}
