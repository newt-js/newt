export class TransactionSpoiled extends Error {
  constructor(cause: unknown) {
    super('The transaction is rolled back: a save that joined it failed, and what it wrote may be half done, even though its error was caught.', { cause })
    this.name = 'TransactionSpoiled'
  }
}
