/** sales-orders → SALES_ORDERS: how the environment variables of a context start. */
export function envNameOf(context: string): string {
  return context.replaceAll('-', '_').toUpperCase()
}

/** An environment variable the backend cannot start without. */
export function requiredEnv(name: string): string {
  const value = Bun.env[name]
  if (!value) {
    throw new Error(`${name} is not set: see .env.example`)
  }
  return value
}
