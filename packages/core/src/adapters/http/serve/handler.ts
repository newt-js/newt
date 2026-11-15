export type Handler = (request: Request, server: Bun.Server<undefined>) => Response | Promise<Response>
