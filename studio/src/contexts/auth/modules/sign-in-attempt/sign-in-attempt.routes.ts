import type { HttpRouter }             from '@newt-js/core/http'
import { bodyOf }                      from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInAttempt_Module }   from './sign-in-attempt.module'
import type { SignInAttemptAnswerDTO } from './sign-in-attempt.schema'

/** Both public: one signs in before having a session. */
export function registerSignInAttemptRoutes(router: HttpRouter, signInAttempts: SignInAttempt_Module) {
  router.post('/sign-in-attempts', async request => {
    const body = await bodyOf(request)
    const started = await signInAttempts.start(body)
    return Response.json(started, { status: 201 })
  }, { public: true })
  router.post('/sign-in-attempts/:id/steps', async request => {
    const body = await bodyOf(request)
    // As given: answerStep parses it, and answers 400 to what it cannot take.
    const answer = { ...body as SignInAttemptAnswerDTO, attemptId: request.params.id }
    const answered = await signInAttempts.answerStep(answer)
    return Response.json(answered)
  }, { public: true })
  return { one: router.group('/sign-in-attempts/:signInAttemptId') }
}
