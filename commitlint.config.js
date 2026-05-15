export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'style',
        'refactor',
        'test',
        'perf',
        'build',
        'ci',
      ],
    ],
    // Scope is required for all commits (satisfies: required for feat and fix)
    'scope-empty': [2, 'never'],
  },
};
