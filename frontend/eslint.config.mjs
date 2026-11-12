import Module from 'node:module';

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  return origResolve.call(
    this,
    request === 'typescript' ? '@typescript/typescript6' : request,
    parent,
    isMain,
    options,
  );
};

const { default: js } = await import('@eslint/js');
const { default: tseslint } = await import('typescript-eslint');
const { default: reactHooks } = await import('eslint-plugin-react-hooks');
const { default: reactRefresh } = await import('eslint-plugin-react-refresh');
const { default: globals } = await import('globals');
const { default: prettierConfig } = await import('eslint-config-prettier');

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/mockServiceWorker.js', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'compact',
            'ALERT_TYPE',
            'vars',
            'html',
            'resetBell',
            'timing',
            'hourSummary',
            'hasSessionOnLoad',
            'useAuth',
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/backend/**', '**/backend'],
              message: 'Frontend code must not import backend modules.',
            },
            {
              group: ['*service-role*', '*service_role*'],
              message: 'Do not import service-role patterns in frontend.',
            },
          ],
          paths: [
            {
              name: '@supabase/supabase-js',
              importNames: ['createClient'],
              message:
                'Do not import createClient directly in frontend components; use getSupabase from @/lib/supabaseClient to avoid service-role key exposure.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-useless-assignment': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['src/pages/HomePage.tsx', 'src/pages/TrafficPage.tsx'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  prettierConfig,
);
