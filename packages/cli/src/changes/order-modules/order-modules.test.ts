import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { diskFiles }    from '../../testing/disk-files/disk-files'
import { orderModules } from './order-modules'

async function ordered(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-order-'))
  await Bun.write(join(cwd, 'm.ts'), content)
  await orderModules('m.ts', diskFiles(cwd))
  return Bun.file(join(cwd, 'm.ts')).text()
}

test('each module after the ones it uses, each with the comments above it', async () => {
  const text = 'export function shopModules(base, router) {\n  // the order\n  const order = Order_Module.initialize(base, router, { invoice })\n  // the invoice\n  const invoice = Invoice_Module.initialize(base, router)\n  return { order, invoice }\n}\n'
  expect(await ordered(text)).toBe('export function shopModules(base, router) {\n  // the invoice\n  const invoice = Invoice_Module.initialize(base, router)\n  // the order\n  const order = Order_Module.initialize(base, router, { invoice })\n  return { order, invoice }\n}\n')
})

test('in order already, nothing changes', async () => {
  const text = 'export function shopModules(base, router) {\n  const invoice = Invoice_Module.initialize(base, router)\n  const order = Order_Module.initialize(base, router, { invoice })\n  return { order, invoice }\n}\n'
  expect(await ordered(text)).toBe(text)
})

test('each feature after the ones it uses, and a module given a used feature is not held by it', async () => {
  const text = 'class Sales_Context {\n  static initialize(base, router) {\n    const campaigns = Campaigns_Feature.initialize(base, router, { contacts })\n    const contacts = Contacts_Feature.initialize(base, router)\n    return new Sales_Context(base, campaigns, contacts)\n  }\n}\n'
  expect(await ordered(text)).toBe('class Sales_Context {\n  static initialize(base, router) {\n    const contacts = Contacts_Feature.initialize(base, router)\n    const campaigns = Campaigns_Feature.initialize(base, router, { contacts })\n    return new Sales_Context(base, campaigns, contacts)\n  }\n}\n')
  const feature = 'class Campaigns_Feature {\n  static initialize(base, router, uses) {\n    const campaign = Campaign_Module.initialize(base, router, { contacts: uses.contacts })\n    const template = Template_Module.initialize(base, router)\n    return new Campaigns_Feature(base, campaign, template)\n  }\n}\n'
  expect(await ordered(feature)).toBe(feature)
})

test('each context after the ones it is opened with', async () => {
  const text = 'async function openContexts(platform, place) {\n  const panel = await Panel_Context.open(platform, place, {\n    auth: auth.context,\n  })\n  const auth = await Auth_Context.open(platform, place)\n  return [auth, panel]\n}\n'
  expect(await ordered(text)).toBe('async function openContexts(platform, place) {\n  const auth = await Auth_Context.open(platform, place)\n  const panel = await Panel_Context.open(platform, place, {\n    auth: auth.context,\n  })\n  return [auth, panel]\n}\n')
})
