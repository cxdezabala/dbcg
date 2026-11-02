import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

const envUrl = process.env.DATABASE_URL || (fs.readFileSync(path.join(__dirname, '.env'), 'utf8').match(/^DATABASE_URL="?([^"\n]+)/m) || [])[1] || '';
const TEST_DB = process.env.TEST_DATABASE_URL || envUrl.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');
process.env.DATABASE_URL = TEST_DB;

export default defineConfig({
  resolve: { alias: [{ find: /^@\/auth$/, replacement: path.resolve(__dirname, 'tests/auth-stub.ts') }, { find: 'server-only', replacement: path.resolve(__dirname, 'tests/server-only-stub.ts') }, { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' }] },
  test: { globalSetup: ['tests/global-setup.ts'], env: { DATABASE_URL: TEST_DB }, include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 30000, fileParallelism: false },
});
