const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['android/**', 'ios/**', 'dist/**', 'coverage/**'] },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: { Buffer: 'readonly' } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
  { files: ['tests/**'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
]);
