import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.wrangler/**', 'artifacts/**', 'design/reference/**', 'supabase/.temp/**', 'supabase/.branches/**']
  },
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];
