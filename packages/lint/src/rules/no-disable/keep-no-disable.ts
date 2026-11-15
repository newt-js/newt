import { Linter } from 'eslint'

/** A message as ESLint hands it to a processor: with the comments that hide it, if any, which its types leave out. */
type Handed = Linter.LintMessage & { suppressions?: unknown[] }

/** The rule whose messages no comment may hide, as the preset names it. */
export const NO_DISABLE = 'newt/no-disable'

/**
 * The processor that keeps `newt/no-disable` from being turned off by the comments it
 * judges: `/* eslint-disable *\/`, or one naming it, turns off every rule after it, this one
 * too. ESLint hands a processor every message, those a comment hides marked with their
 * `suppressions`, and sets the hidden ones apart after it: this takes the mark off the
 * rule's own, so they are told whatever the comment says. The code is linted as it is, in
 * one block.
 */
export const keepNoDisable: Linter.Processor = {
  meta: { name: 'newt/keep-no-disable' },
  supportsAutofix: true,
  preprocess(text) {
    return [text]
  },
  postprocess(messages) {
    return messages.flat().map((message: Handed) => {
      if (message.ruleId !== NO_DISABLE || !message.suppressions) return message
      const { suppressions: _, ...told } = message
      return told
    })
  },
}
