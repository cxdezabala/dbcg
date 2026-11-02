import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: [{ find: /^@\/auth$/, replacement: path.resolve(__dirname, 'tests/auth-stub.ts') }, { find: 'server-only', replacement: path.resolve(__dirname, 'tests/server-only-stub.ts') }, { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' }] },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 30000, fileParallelism: false },
});
