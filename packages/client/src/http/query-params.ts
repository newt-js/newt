/** What a request puts after `?`: a value left undefined is left out. */
export type QueryParams = Record<string, string | number | boolean | undefined>
