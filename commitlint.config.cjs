module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 200],
    'scope-case': [0, 'always', 'lower-case'],
    'type-enum': [2, 'always', ['build', 'chore', 'docs', 'feat', 'fix', 'perf', 'refactor', 'release', 'style', 'test', 'update']],
  },
};
