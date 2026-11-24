import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { MemoryEmail } from './memory-email'

test('keeps the emails in the order they were sent', async () => {
  const email = new MemoryEmail()

  await email.send({ to: 'ana@example.com', subject: 'First', text: 'Hello' })
  await email.send({ to: 'eva@example.com', subject: 'Second', text: 'Hello' })

  expect(email.sent.map(each => each.subject)).toEqual(['First', 'Second'])
})
