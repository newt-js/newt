export function withHeadersSet(response: Response, headers: Record<string, string | null>): Response {
  const copy = new Response(response.body, response)
  for (const [name, value] of Object.entries(headers)) {
    if (value === null) {
      copy.headers.delete(name)
    } else {
      copy.headers.set(name, value)
    }
  }
  return copy
}
