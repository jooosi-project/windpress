import { readFileSync } from 'node:fs';

import { afterAll, describe, expect, it } from 'vitest';

const originalFetch = globalThis.fetch;
const wasm = readFileSync(new URL('../pkg/tailwindcss-oxide.browser.wasm', import.meta.url));

globalThis.fetch = async () => new Response(wasm);

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('Tailwind Oxide browser WASI package', () => {
  it('extracts unique candidates from one or many content files', async () => {
    const { Scanner } = await import('../pkg/browser.mjs');
    const scanner = new Scanner({});
    const candidates = scanner.scanFiles([
      { content: '<div class="flex p-4 text-white"></div>', extension: 'html' },
      { content: '<span class="p-4 hover:underline"></span>', extension: 'html' },
    ]);

    expect(new Set(candidates)).toEqual(
      new Set(['class', 'flex', 'p-4', 'text-white', 'hover:underline']),
    );
  });

  it('extracts Unicode arbitrary values through the browser scanner', async () => {
    const html = '<div class="before:content-[' + "'✓'" + '] font-[café]"></div>';
    const { Scanner } = await import('../pkg/browser.mjs');
    const scanner = new Scanner({});

    expect(new Set(scanner.scanFiles([{ content: html, extension: 'html' }]))).toEqual(
      new Set(['class', "before:content-['✓']", 'font-[café]']),
    );
  });
});
