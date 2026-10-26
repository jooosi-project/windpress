import { createHash } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import init, { browserslistToTargets, Features, transform } from '@windpress/lightningcss-wasm';

const css = [
  '@custom-media --tablet (width >= 48rem);',
  '@layer utilities {',
  '  .card {',
  '    margin-inline: 1rem;',
  '    color: oklch(0.62 0.17 250);',
  '    &:hover { color: light-dark(#111, #eee); }',
  '  }',
  '  @media (--tablet) {',
  '    .card { padding-inline: 2rem; }',
  '  }',
  '}',
  '@media (width >= 30rem) and (width <= 60rem) {',
  '  .range { display: flex; user-select: none; }',
  '}',
  ':deep(.child) { appearance: none; }',
  '.invalid { color: definitely-not-a-color; }',
].join('\n');

const v3Targets = {
  and_chr: 10158080,
  and_ff: 10354688,
  android: 10158080,
  chrome: 7143424,
  edge: 9961472,
  firefox: 10027008,
  ios_saf: 1180928,
  op_mob: 5242880,
  opera: 8781824,
  safari: 1705472,
  samsung: 1900544,
};

const v4Targets = {
  safari: (16 << 16) | (4 << 8),
  ios_saf: (16 << 16) | (4 << 8),
  firefox: 128 << 16,
  chrome: 111 << 16,
};

const sourceMap = JSON.stringify({
  version: 3,
  sources: ['windpress-input.css'],
  names: [],
  mappings: '',
});

// Digests were captured from upstream lightningcss-wasm 1.33.0 using these WindPress call-site options.
const v3Expected: Record<'false' | 'true', string> = {
  'false': '9e1901d02ae3a7892cba93b8d3124dba1a58077104150302e09806fedc9b6736',
  'true': '15629b35a7785179e1c9295ab2e4c1b79fa1b2f18f6697c9a82ffc66fef0fa75',
};

const v4Expected: Record<string, string> = {
  'false:false:1': '3fecb88177d7fc8a52b8ca2dc5daba384564bf82d89a1b95363d340168d77d4e',
  'false:false:2': '3fcd6da6a61260f0824b320b910cde88b6f709a4cd25352a1b43caba4d307e7d',
  'false:true:1': '72123ff21e6b75200646b526ea48d8f0fadfb3b01ec6dd1efef3db380ab6ce6f',
  'false:true:2': '2b0c50e851589fea0c9e3436a80858e41b8545bf130e2c587de57631bd99ceb6',
  'true:false:1': '1f67e24c3cc9238545b274a02f0aa3236af89ba00c5cfa881d99066fae7629c5',
  'true:false:2': '7961e3e89b712e7a8bb3aad7c207eb9eb0426397f0956a83a2384a2e57ae27d2',
  'true:true:1': '1232f1516bba381f97bac85ce4f0775de1f1d3a7bcf2100be13f2ce89d5b3c5b',
  'true:true:2': '222afe4b09cdc2ffa7bdfc6cc332d2f70e1adec83d6934bb1f84ced3d8b86b63',
};

function normalize(result: ReturnType<typeof transform>) {
  const decode = (value: Uint8Array | null) => value === null ? null : new TextDecoder().decode(value);

  return {
    code: decode(result.code),
    map: decode(result.map),
    warnings: result.warnings,
  };
}

function digest(result: ReturnType<typeof transform>) {
  return createHash('sha256').update(JSON.stringify(normalize(result))).digest('hex');
}

function transformV4(code: Uint8Array, minify: boolean, withMap: boolean) {
  const first = transform({
    filename: 'windpress-v4.css',
    code,
    minify,
    sourceMap: withMap,
    inputSourceMap: withMap ? sourceMap : undefined,
    drafts: { customMedia: true },
    nonStandard: { deepSelectorCombinator: true },
    include: Features.Nesting | Features.MediaQueries,
    exclude: Features.LogicalProperties | Features.DirSelector | Features.LightDark,
    targets: v4Targets,
    errorRecovery: true,
  });

  const second = transform({
    filename: 'windpress-v4.css',
    code: first.code,
    minify,
    sourceMap: first.map !== null,
    inputSourceMap: first.map === null ? undefined : new TextDecoder().decode(first.map),
    drafts: { customMedia: true },
    nonStandard: { deepSelectorCombinator: true },
    include: Features.Nesting | Features.MediaQueries,
    exclude: Features.LogicalProperties | Features.DirSelector | Features.LightDark,
    targets: v4Targets,
    errorRecovery: true,
  });

  return [first, second];
}

describe('WindPress Lightning CSS WASM parity', () => {
  beforeAll(async () => {
    await init();
  });

  it('retains the feature flags and target helper values used by WindPress', () => {
    expect({
      Nesting: Features.Nesting,
      DirSelector: Features.DirSelector,
      MediaIntervalSyntax: Features.MediaIntervalSyntax,
      MediaRangeSyntax: Features.MediaRangeSyntax,
      CustomMediaQueries: Features.CustomMediaQueries,
      LogicalProperties: Features.LogicalProperties,
      LightDark: Features.LightDark,
      MediaQueries: Features.MediaQueries,
    }).toEqual({
      Nesting: 1,
      DirSelector: 4,
      MediaIntervalSyntax: 64,
      MediaRangeSyntax: 128,
      CustomMediaQueries: 256,
      LogicalProperties: 524288,
      LightDark: 1048576,
      MediaQueries: 448,
    });

    expect(browserslistToTargets([
      'chrome 123',
      'chrome 122',
      'and_chr 124',
      'and_ff 117.1',
      'ie_mob 11',
      'op_mini all',
      'safari 17.3',
    ])).toEqual({
      chrome: 7995392,
      and_chr: 8126464,
      and_ff: 7667968,
      ie_mob: 720896,
      safari: 1114880,
    });
  });

  it('matches upstream 1.33.0 output for the Tailwind v3 optimizer options', () => {
    const code = new TextEncoder().encode(css);

    for (const minify of [false, true]) {
      const result = transform({
        filename: 'windpress-v3.css',
        code,
        minify,
        sourceMap: false,
        targets: v3Targets,
        errorRecovery: true,
      });

      const key = minify ? 'true' : 'false';
      expect(digest(result), `minify=${minify}`).toBe(v3Expected[key]);
    }
  });

  it('matches upstream 1.33.0 output for the Tailwind v4 two-pass optimizer and source maps', () => {
    const code = new TextEncoder().encode(css);

    for (const minify of [false, true]) {
      for (const withMap of [false, true]) {
        const results = transformV4(code, minify, withMap);

        for (const [index, result] of results.entries()) {
          const pass = String(index + 1);
          const key = `${minify}:${withMap}:${pass}`;
          expect(digest(result), key).toBe(v4Expected[key]);
        }
      }
    }
  });
});
