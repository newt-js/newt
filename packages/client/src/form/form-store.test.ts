import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
import { z }         from 'zod'
// --------------------------------------------------------
import { ApiError }  from '../http/api-error'
import { FormStore } from './form-store'

const schema = z.object({ name: z.string().min(2, 'Too short'), city: z.string() })

const newForm = () => new FormStore(schema, { name: '', city: '' })

describe('FormStore', () => {
  test('does not send what the schema finds wrong, and says it by field', async () => {
    const form = newForm()
    let sent = false

    const result = await form.submit(async () => { sent = true })

    expect(result).toBeNull()
    expect(sent).toBe(false)
    expect(form.errors.value).toEqual({ name: 'Too short' })
  })

  test('sends the checked values and gives what was answered', async () => {
    const form = newForm()
    form.set('name', 'Acme')

    const result = await form.submit(async values => ({ id: 'c-1', ...values }))

    expect(result).toEqual({ id: 'c-1', name: 'Acme', city: '' })
    expect(form.submitting.value).toBe(false)
  })

  test("shows by each field what the backend found wrong", async () => {
    const form = newForm()
    form.set('name', 'Acme')

    await form.submit(async () => { throw new ApiError(400, 'The input is not valid', 'validation', [{ field: 'city', message: 'Unknown city' }]) })

    expect(form.errors.value).toEqual({ city: 'Unknown city' })
  })

  test('any other failure of the backend is an error of the whole form', async () => {
    const form = newForm()
    form.set('name', 'Acme')

    await form.submit(async () => { throw new ApiError(409, 'A client is called Acme already', 'client.taken') })

    expect(form.errors.value).toEqual({ '': 'A client is called Acme already' })
  })

  test('changing a value forgets what was wrong with it', async () => {
    const form = newForm()
    await form.submit(async () => null)

    form.set('name', 'Acme')

    expect(form.errors.value).toEqual({})
  })
})
