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
    // 建置測試的匯出資料夾（tests/build-fixture.test.ts 以 SITE_OUT_DIR=out-fixture 建置），裡面是產生出來的程式碼，不檢查；
    "out-fixture/**",
    // sync-assets 從 repo 根目錄 assets/ 複製來的檔案（不進版控，原檔不在本專案的 lint 範圍）；
    "public/assets/**",
  ]),
]);

export default eslintConfig;
