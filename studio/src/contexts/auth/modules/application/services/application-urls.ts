/** Where applications are: each at a subdomain of this address' host, `http://backoffice.localhost:3000` locally. */
function base(): URL {
  return new URL(Bun.env.AUTH_APPLICATIONS_URL ?? 'http://localhost:3000')
}

/** The slug of the application a host is of, or null when the host is not one subdomain of the base. */
export function slugAtHost(host: string): string | null {
  const suffix = `.${base().host}`
  const lower = host.trim().toLowerCase()
  const slug = lower.endsWith(suffix) ? lower.slice(0, -suffix.length) : ''
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null
}

/** The address of an application: its subdomain, with the scheme and port of the base. */
export function applicationUrlOf(slug: string): string {
  const url = base()
  return `${url.protocol}//${slug}.${url.host}`
}
