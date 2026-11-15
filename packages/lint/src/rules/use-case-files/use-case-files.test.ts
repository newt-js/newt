import { MODULE }       from '../../testing/testing'
import { asRule }       from '../../testing/testing'
import { tester }       from '../../testing/testing'
import { useCaseFiles } from './use-case-files'

const inModule = (body: string) => `
  import { Module, UseCase } from '@newt-js/core'
  export class Attachment_Module extends Module {
    ${body}
  }`
const MODULE_FILE = `${MODULE}/price-change.module.ts`

tester.run('use-case-files', asRule(useCaseFiles), {
  valid: [
    { code: inModule('@UseCase() async uploadStart() { return this.files.uploadUrl(key, options) }'), filename: MODULE_FILE },
    { code: inModule('@UseCase() async uploadConfirm() { return this.files.verifyUpload(key, rule) }'), filename: MODULE_FILE },
    { code: inModule('@UseCase() async downloadUrl() { return this.files.signedUrl(key, options) }'), filename: MODULE_FILE },
    { code: inModule('@UseCase() async avatarUploadStart() { return this.files.uploadUrl(key, options) }'), filename: MODULE_FILE },
    // Inside what the use case runs: it is still the use case's.
    { code: inModule('@UseCase() async uploadStart() { return retry(() => this.files.uploadUrl(key, options)) }'), filename: MODULE_FILE },
    // The rest of a file's life needs no name of its own.
    { code: inModule('@UseCase() async remove() { await this.files.delete(key) }'), filename: MODULE_FILE },
    // A class that is no module, named as it likes, and a test.
    { code: 'class Other { async uploadStart() {} }', filename: MODULE_FILE },
    { code: 'await files.verifyUpload(key, rule)', filename: `${MODULE}/price-change.test.ts` },
  ],
  invalid: [
    { code: inModule('@UseCase() async start() { return this.files.uploadUrl(key, options) }'), filename: MODULE_FILE, errors: [{ messageId: 'wrongName' }] },
    { code: inModule('@UseCase() async confirm() { return this.files.verifyUpload(key, rule) }'), filename: MODULE_FILE, errors: [{ messageId: 'wrongName' }] },
    { code: inModule('@UseCase() async link() { return this.files.signedUrl(key, options) }'), filename: MODULE_FILE, errors: [{ messageId: 'wrongName' }] },
    // A helper does not hide it, whichever way it is reached.
    { code: inModule("private sign() { return this.files['uploadUrl'](key, options) }"), filename: MODULE_FILE, errors: [{ messageId: 'wrongName' }] },
    { code: inModule('private sign() { const { uploadUrl } = this.files; return uploadUrl(key, options) }'), filename: MODULE_FILE, errors: [{ messageId: 'wrongName' }] },
    // Named so, it must do it: an upload confirmed unverified is the hole this closes.
    { code: inModule('@UseCase() async uploadConfirm() { await this.repo.persist(attachment) }'), filename: MODULE_FILE, errors: [{ messageId: 'missing' }] },
    { code: inModule('@UseCase() async avatarUploadStart() { return null }'), filename: MODULE_FILE, errors: [{ messageId: 'missing' }] },
    // Nor outside the module: its routes, a service.
    { code: 'export const sign = files => files.signedUrl(key, options)', filename: `${MODULE}/services/sign.ts`, errors: [{ messageId: 'outside' }] },
    { code: 'export const routes = files => files.uploadUrl(key, options)', filename: `${MODULE}/price-change.routes.ts`, errors: [{ messageId: 'outside' }] },
  ],
})
