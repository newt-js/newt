/** Who an email is from: what is left out is the context's own. */
export type EmailFrom = {
  /** As it is shown: `Shop`. */
  name?: string | undefined
  address?: string | undefined
}
