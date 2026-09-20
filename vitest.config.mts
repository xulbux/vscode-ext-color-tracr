import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      vscode: path.resolve(import.meta.dirname, 'test/__mocks__/vscode.ts'),
    },
  },
  test: { globals: true, include: ['test/**/*.test.ts'], root: '.' },
});
