import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../../../', import.meta.url)),
      '~': fileURLToPath(new URL('../../../../', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['resources/packages/core/windpress/*.test.ts', 'tests/scan/source.test.ts'],
  },
});
