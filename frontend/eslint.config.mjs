import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // next-pwa emits minified service-worker bundles into /public on build;
    // they are not project source and would dominate the lint report.
    "public/sw.js",
    "public/workbox-*.js",
    "public/fallback-*.js",
    "public/swe-worker-*.js",
    "public/worker-*.js",
  ]),
  {
    // Honor the `_`-prefix convention: identifiers starting with `_` are
    // intentionally unused (destructured-but-skipped, partially-applied props).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
