export function headOf(response: Response): Response {
  void response.body?.cancel().catch(() => {})
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers })
}
