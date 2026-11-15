import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { contentDisposition } from './content-disposition'
import { mayShowInline }      from './content-disposition'

describe('contentDisposition', () => {
  test('is an attachment unless told inline, and only types a browser shows safely may be', () => {
    expect(contentDisposition('image/png')).toBe('attachment')
    expect(contentDisposition('image/png', 'inline')).toBe('inline')
    expect(contentDisposition('text/html', 'inline')).toBe('attachment')
  })

  test('names the file in plain ASCII and in UTF-8', () => {
    expect(contentDisposition('application/pdf', 'attachment', 'año "1".pdf')).toBe(`attachment; filename="a_o _1_.pdf"; filename*=UTF-8''a%C3%B1o%20%221%22.pdf`)
  })
})

describe('mayShowInline', () => {
  test('is an image or a PDF, whatever the parameters', () => {
    expect(mayShowInline('image/jpeg; charset=binary')).toBe(true)
    expect(mayShowInline('image/svg+xml')).toBe(false)
  })
})
