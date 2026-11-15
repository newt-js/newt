import { TSESLint } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/utils'

export type NoDisableOptions = { rules?: string[] }

type MessageId = 'block' | 'config' | 'unnamed' | 'reason'

const MESSAGES: Record<MessageId, string> = {
  block: "`{{kind}}` turns off {{rules}} for a stretch of code: newt's rules are never turned off so. Change the code until it passes; if one line truly cannot, use `eslint-disable-next-line <rule> -- <why>` on it.",
  config: "This comment changes {{rules}}: newt's rules are set by its preset, never in the code. Change the code until it passes.",
  unnamed: "`{{kind}}` with no rule turns off every rule, newt's too: name the one rule this line breaks, and say why after `--`.",
  reason: "`{{kind}} {{rules}}` says no reason: say why this line cannot follow the rule, after `--` (`{{kind}} {{rules}} -- <why>`). Better yet, change the code until it passes.",
}

/** A comment that tells ESLint something: its kind and the rest, read as ESLint reads it. */
const DIRECTIVE = /^\s*(eslint-disable-next-line|eslint-disable-line|eslint-disable|eslint-enable|eslint)(?:\s|$)([\s\S]*)$/u

type Directive = { kind: string, rules: string[], reason: string }

/** The kind of a directive, the rules it names and its reason: what follows ` -- `, as ESLint splits it. */
function directiveOf(comment: TSESTree.Comment): Directive | null {
  const match = DIRECTIVE.exec(comment.value)
  if (!match) return null
  const [, kind = '', rest = ''] = match
  const [listed = '', reason = ''] = rest.split(/\s-{2,}\s/u)
  const rules = listed.split(',').map(each => each.trim().split(/[\s:]/u)[0]!).filter(each => each !== '')
  return { kind, rules, reason: reason.trim() }
}

/**
 * The lint is how an application keeps newt's rules, and a comment that turns one off is
 * a way around them: an agent that cannot make the code pass would make the lint pass
 * instead. So no comment turns off a rule of newt's (`newt/…`, or one the preset
 * names) for a stretch of code (`eslint-disable`) or changes it (`eslint newt/…: off`);
 * one line may be let off (`eslint-disable-next-line`, `eslint-disable-line`) when the
 * comment names the rule and says why, after `--`.
 *
 * A comment that turns off every rule turns off this one too, and ESLint would drop what
 * it says: the preset's processor (`keepNoDisable`) tells it all the same.
 */
export const noDisable: TSESLint.RuleModule<MessageId, [NoDisableOptions]> = {
  defaultOptions: [{}],
  meta: {
    type: 'problem',
    docs: { description: "No comment turns off a rule of newt's, but for one line, naming it and saying why." },
    messages: MESSAGES,
    schema: [{
      type: 'object',
      properties: { rules: { type: 'array', items: { type: 'string' } } },
      additionalProperties: false,
    }],
  },
  create(context) {
    const [{ rules: named = [] }] = context.options
    const kept = (rule: string) => rule.startsWith('newt/') || named.includes(rule)
    const report = (comment: TSESTree.Comment, messageId: MessageId, data: Record<string, string>) => context.report({ loc: comment.loc, messageId, data })
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const directive = directiveOf(comment)
          if (!directive || directive.kind === 'eslint-enable') continue
          const { kind } = directive
          const covered = directive.rules.filter(kept)
          const rules = covered.join(', ')
          if (kind === 'eslint') {
            if (covered.length > 0) report(comment, 'config', { rules })
          } else if (kind === 'eslint-disable') {
            if (directive.rules.length === 0) report(comment, 'block', { kind, rules: 'every rule' })
            else if (covered.length > 0) report(comment, 'block', { kind, rules })
          } else if (directive.rules.length === 0) {
            report(comment, 'unnamed', { kind })
          } else if (covered.length > 0 && directive.reason === '') {
            report(comment, 'reason', { kind, rules })
          }
        }
      },
    }
  },
}
