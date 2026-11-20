import type { ContextBase }            from '@newt-js/core/application'
import type { HttpRouter }             from '@newt-js/core/http'
import { bodyOf }                      from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInAttempt_Module }   from './sign-in-attempt.module'
import type { SignInAttemptAnswerDTO } from './sign-in-attempt.schema'

/** Both public: one signs in before having a session. Each address gets a few tries a minute. */
export function registerSignInAttemptRoutes(router: HttpRouter, signInAttempts: SignInAttempt_Module, rateLimits: ContextBase['rateLimits']) {
  const tries = rateLimits.define('signInAttempt.tries', { limit: 20, windowMs: 60_000 })
  const rateLimit = { limit: tries, by: 'ip' as const }
  router.post('/sign-in-attempts', async request => {
    const body = await bodyOf(request)
    const started = await signInAttempts.start(body)
    return Response.json(started, { status: 201 })
  }, { public: true, rateLimit })
  router.post('/sign-in-attempts/:id/steps', async request => {
    const body = await bodyOf(request)
    // As given: answerStep parses it, and answers 400 to what it cannot take.
    const answer = { ...body as SignInAttemptAnswerDTO, attemptId: request.params.id }
    const answered = await signInAttempts.answerStep(answer)
    return Response.json(answered)
  }, { public: true, rateLimit })
  return { one: router.group('/sign-in-attempts/:signInAttemptId') }
}
