import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default ts.config(
  { ignores: ['**/dist/**', 'obsidian-plugin/main.js', 'docs/audit/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      'symbiote/src/entities/character/ui/AttackCard.tsx',
      'symbiote/src/features/manage-concentration/ui/ConcentrationBanner.tsx',
      'symbiote/src/features/manage-inventory/ui/EditItemModal.tsx',
      'symbiote/src/features/manage-spells/ui/SpellCastModal.tsx',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'error' },
  },
);
