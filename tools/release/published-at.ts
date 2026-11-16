/** When npm got name@version, or null when it has not got it. */
export const publishedAt = async (name: string, version: string): Promise<Date | null> => {
  const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`npm answered ${response.status} for ${name}`)
  const { time = {} } = await response.json() as { time?: Record<string, string> }
  return time[version] ? new Date(time[version]) : null
}
