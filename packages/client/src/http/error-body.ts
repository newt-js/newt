/** What newt's backend answers when a request fails: the message, the error's code and, for an input that is not valid, its issues. */
export type ErrorBody = {
  error: string
  code?: string
  issues?: { path: (string | number)[], message: string }[]
}
