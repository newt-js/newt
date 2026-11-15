import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { Email }        from './email'
import { emailFactory } from './email'
import { InvalidEmail } from './invalid-email/invalid-email'

const atMost = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.dev`

describe('Email', () => {
  test('is kept trimmed and in lower case: one address, whatever was typed', () => {
    expect(Email.from('  Lucia@Acme.dev ')).toBe('lucia@acme.dev' as Email)
  })

  test('refuses what is not an address, naming it as it was typed', () => {
    expect(() => Email.from(' Lucia ')).toThrow(InvalidEmail)
    expect(() => Email.from(' Lucia ')).toThrow("' Lucia ' is not a valid email")

    const error = new InvalidEmail('x')
    expect(error.kind).toBe('validation')
    expect(error.code).toBe('invalid_email')
  })

  test('takes up to 254 characters, the longest an address can be', () => {
    expect(atMost).toHaveLength(254)
    expect(Email.from(atMost)).toBe(atMost as Email)
    expect(() => Email.from(`${atMost}x`)).toThrow(InvalidEmail)
  })

  test('its schema keeps it as from does: trimmed and in lower case', () => {
    expect(Email.schema.parse(' Lucia@Acme.dev ')).toBe('lucia@acme.dev' as Email)
    expect(Email.schema.safeParse('lucia').success).toBe(false)
    expect(Email.schema.safeParse(`${atMost}x`).success).toBe(false)
  })
})

describe('emailFactory', () => {
  test('makes the email value object: trimmed and in lower case, or refused', () => {
    const Email = emailFactory()

    expect(Email.from(' Lucia@Acme.dev ') as string).toBe('lucia@acme.dev')
    expect(() => Email.from('lucia')).toThrow(InvalidEmail)
  })
})
