export function isEventStream(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase() === 'text/event-stream'
}
