import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getCandidates, initSync } from '../pkg/oxide_parser.js';

const wasm = readFileSync(new URL('../pkg/oxide_parser_bg.wasm', import.meta.url));

describe('internal Tailwind Oxide parser', () => {
  it('extracts unique candidates from single and batched inputs', () => {
    initSync({ module: wasm });

    const candidates = getCandidates([
      '<div class="flex p-4 text-white"></div>',
      '<span class="p-4 hover:underline"></span>',
    ]) as string[];

    expect(new Set(candidates)).toEqual(
      new Set(['class', 'flex', 'p-4', 'text-white', 'hover:underline']),
    );
  });
});
