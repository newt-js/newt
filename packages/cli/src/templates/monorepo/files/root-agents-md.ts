export const ROOT_AGENTS_MD = `# Agents

A monorepo of backends built with newt (@newt-js/core), on Bun: each backend is a workspace,
with an AGENTS.md of its own that says how it is laid out.

## Commands

- \`bun run test\`, \`bun run typecheck\`, \`bun run lint\`: each in every workspace. All three must pass.
  \`bun test\` here does not read each backend's \`.env.test\`: run it inside a backend.
- \`bun run dev\`: every backend, restarted on every change.
- \`bunx newt add backend <folder>\`: another backend. Before \`bun install\`, \`bunx @newt-js/cli\`.
`
