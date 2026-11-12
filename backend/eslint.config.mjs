import Module from "node:module";

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  return origResolve.call(
    this,
    request === "typescript" ? "@typescript/typescript6" : request,
    parent,
    isMain,
    options,
  );
};

const { default: js } = await import("@eslint/js");
const { default: tseslint } = await import("typescript-eslint");
const { default: globals } = await import("globals");
const { default: prettierConfig } = await import("eslint-config-prettier");

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^ScrapedFbPost",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
