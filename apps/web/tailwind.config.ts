import type { Config } from 'tailwindcss';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// packages/config has "type":"module" so tailwind.base.js is ESM (export default).
// createRequire loads it as CJS-wrapped ESM; the result is { default: Config }.
// The fallback branch handles any future CJS rewrite that uses module.exports directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const baseConfig = require('@shardveil/config/tailwind.base.js') as { default: Config };
const base = baseConfig.default ?? (baseConfig as unknown as Config);

const config: Config = {
  ...base,
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    ...base.theme,
    extend: {
      ...base.theme?.extend,
      fontFamily: {
        display: ['var(--font-display)', 'Cinzel', 'serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
};

export default config;
