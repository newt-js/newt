export const ENV_TS = `export function requiredEnv(name: string): string {
  const value = Bun.env[name]
  if (!value) {
    throw new Error(\`\${name} is not set: see .env.example\`)
  }
  return value
}
`
