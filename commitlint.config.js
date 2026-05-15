export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'scope-required-for-feat-fix': ({ type, scope }) => {
          if (['feat', 'fix'].includes(type) && !scope) {
            return [false, 'scope is required for feat and fix commits'];
          }
          return [true, ''];
        },
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'test', 'perf', 'build', 'ci'],
    ],
    'scope-required-for-feat-fix': [2, 'always'],
  },
};
