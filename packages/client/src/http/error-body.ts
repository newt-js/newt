/** What newt's backend answers when a request fails: the message, and the error's code. */
export type ErrorBody = {
  error: string
  code?: string
}
