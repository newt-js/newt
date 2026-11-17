export function errorReport(message: string, json: boolean): string {
  return json ? JSON.stringify({ error: message }, null, 2) : message
}
