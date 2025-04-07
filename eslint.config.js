import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/"], // standalone to be global
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      "no-constant-condition": [
        "warn",
        {
          checkLoops: false,
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-private-class-members": "off",
    },
  },
];
