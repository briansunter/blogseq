module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 200], // Increase from 100 to 200 to accommodate URLs
  },
};