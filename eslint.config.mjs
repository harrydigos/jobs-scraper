import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/recommended';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ...solid,
  },
  {
    ignores: ['node_modules/**', '.dist/**'],
  },
];
