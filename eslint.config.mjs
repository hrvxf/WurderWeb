import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "src/app/create-account/**",
      "src/app/email-login/**",
      "src/app/delete-account/**",
      "src/app/profile/**",
      "src/app/utils/**",
      "src/components/auth/**",
      "src/components/Header.tsx",
      "src/components/Footer.tsx",
      "src/components/PriceSection.tsx",
      "src/functions/**",
    ],
  },
  {
    files: ["src/app/business/**/*.{ts,tsx}", "src/components/business/**/*.{ts,tsx}", "src/lib/business/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/admin/**"],
              message: "Business modules must not import admin components directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/(members)/**/*.{ts,tsx}", "src/components/members/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/business/**", "@/lib/business/**"],
              message: "Personal modules must not import Business modules except explicit bridges.",
            },
          ],
        },
      ],
    },
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
