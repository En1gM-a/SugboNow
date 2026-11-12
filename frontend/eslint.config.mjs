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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
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
  prettierConfig,
);
