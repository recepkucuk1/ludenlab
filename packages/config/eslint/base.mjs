import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Paylaşılan flat ESLint config (tip-bilgisi gerektirmez → CI'da hızlı).
 * App'ler kendi eslint.config.mjs'inde bunu import edip genişletir.
 */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/out/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
