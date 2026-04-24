import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/components/**",
                "@/app/hooks/**",
                "@/app/lib/**",
              ],
              message: "I path legacy sono vietati. Usa solo app/_features, app/_shared o app/_server.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx", "app/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/_features/**",
                "@/app/_shared/**",
                "@/app/_server/**",
                "!@/app/_features/*",
                "!@/app/_shared",
                "!@/app/_server",
              ],
              message: "Page/Layout/Route devono importare solo dagli entrypoint root: @/app/_features/*, @/app/_shared, @/app/_server.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
