import { join } from 'node:path'

const BUN_INIT_FILES: Record<string, string> = {
  'package.json': `${JSON.stringify({
    name: 'shop',
    module: 'index.ts',
    type: 'module',
    private: true,
    scripts: { typecheck: 'bun check' },
    devDependencies: { '@types/bun': 'latest' },
    peerDependencies: { typescript: '^7' },
  }, null, 2)}\n`,
  'tsconfig.json': `${JSON.stringify({
    compilerOptions: {
      lib: ['ESNext'],
      target: 'ESNext',
      module: 'Preserve',
      moduleDetection: 'force',
      jsx: 'react-jsx',
      allowJs: true,
      types: ['bun'],
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      noImplicitOverride: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noPropertyAccessFromIndexSignature: false,
    },
  }, null, 2)}\n`,
  'index.ts': 'console.log("Hello via Bun!");\n',
  '.gitignore': '# dependencies (bun install)\nnode_modules\n\n# dotenv environment variable files\n.env\n.env.local\n',
  'CLAUDE.md': 'Default to using Bun instead of Node.js.\n\n- Use `bun test` instead of `jest` or `vitest`\n',
  'README.md': '# shop\n\nTo run:\n\n```bash\nbun run index.ts\n```\n',
}

/** Writes into `folder` what `bun init` leaves, as Bun 1.4.4 writes it, but its lockfile and node_modules. */
export async function writeBunInitProject(folder: string, changes: Record<string, string> = {}): Promise<void> {
  for (const [path, content] of Object.entries({ ...BUN_INIT_FILES, ...changes })) {
    await Bun.write(join(folder, path), content)
  }
}
