const KEPT_HEADERS = new Set([
  'content-type', 'content-encoding', 'content-language', 'content-disposition', 'content-location',
  'location', 'etag', 'last-modified', 'link', 'cache-control', 'vary', 'retry-after',
])

export const keptHeaders = (headers: Iterable<[string, string]>) => [...headers].filter(([name]) => KEPT_HEADERS.has(name.toLowerCase()))
