import baseConfig from './packages/config/eslint.base.js';

export default [
  ...baseConfig,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'apps/web/.next/**',
      '**/*.d.ts',
      'prisma/migrations/**',
    ],
  },
];
