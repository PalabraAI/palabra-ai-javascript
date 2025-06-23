// import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    rules: {
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'keyword-spacing': ['error', { before: true, after: true }],
      'space-infix-ops': 'error',
      'space-before-blocks': 'error',
      'space-in-parens': ['error', 'never'],
      'comma-spacing': ['error', { before: false, after: true }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
);