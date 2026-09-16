import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';
import { compressToUTF16 } from '@windpress/lz-string';

import { getCandidates, initSync } from '../../oxide-parser/pkg/oxide_parser.js';
import {
  decodeProviderContent,
  encodeProviderCache,
  isProviderContents,
  mapConcurrent,
  providerCacheKey,
  readProviderCache,
  readScanCursor,
  SourceSnapshotCollector,
} from './scanner';
import type { SourceSnapshot } from './scanner';

const contents = [{ content: 'ZmxleA==', type: 'html' }];
const revision = '1'.repeat(64);
const nextRevision = '2'.repeat(64);
const sourceHash = 'a'.repeat(64);
const snapshot: SourceSnapshot = {
  scope: 'provider-scope',
  revision,
  sources: [{ source_id: 'post:1', source_hash: sourceHash, normalized: 'flex' }],
};

function indexedContent(id: string, content: string, hash = sourceHash) {
  return { source_id: id, source_hash: hash, content: Buffer.from(content).toString('base64') };
}

function sourceIndexPage(changed: number, overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    mode: 'snapshot',
    scope: snapshot.scope,
    base_revision: null,
    revision: nextRevision,
    deleted: [],
    examined: changed,
    changed,
    unchanged: 0,
    ...overrides,
  };
}

describe('provider cache generations', () => {
  it('reuses a fresh full-build cache without comparing client timestamps', () => {
    const cached = encodeProviderCache(snapshot, 'published-generation');

    expect(readProviderCache(cached, 'published-generation')).toEqual({ success: true, snapshot });
    expect(readProviderCache(cached, 'newer-generation').success).toBe(false);
  });

  it.each([
    null,
    123,
    'corrupt data',
    compressToUTF16('{invalid json'),
    compressToUTF16(JSON.stringify({ timestamp: Date.now(), contents })),
    compressToUTF16(JSON.stringify({ version: 1, generation: 'current', contents: null })),
    compressToUTF16(JSON.stringify({ version: 1, generation: 'current', contents: [{ content: null }] })),
    compressToUTF16(JSON.stringify({ version: 2, generation: 'current', snapshot: { ...snapshot, revision: 'invalid-revision' } })),
    compressToUTF16(JSON.stringify({ version: 2, generation: 'current', snapshot: { ...snapshot, sources: [...snapshot.sources, ...snapshot.sources] } })),
  ])('falls back to scanning for an invalid or legacy cache: %s', (cached) => {
    expect(readProviderCache(cached, 'current').success).toBe(false);
  });

  it('requires a nonempty server generation', () => {
    expect(readProviderCache(encodeProviderCache(snapshot, ''), '').success).toBe(false);
  });

  it('isolates sites hosted under the same origin', () => {
    expect(providerCacheKey('https://example.test/site-a/wp-json/', 'gutenberg')).not.toBe(
      providerCacheKey('https://example.test/site-b/wp-json/', 'gutenberg'),
    );
    expect(providerCacheKey('https://example.test/wp-json/', 'gutenberg')).toBe(
      providerCacheKey('https://example.test/wp-json', 'gutenberg'),
    );
  });
});

describe('source snapshot merging', () => {
  it('reuses unchanged normalized bodies and replaces changes without mutating the baseline', () => {
    const baseline: SourceSnapshot = {
      ...snapshot,
      sources: [
        ...snapshot.sources,
        { source_id: 'post:2', source_hash: 'b'.repeat(64), normalized: 'p-4' },
        { source_id: 'post:3', source_hash: 'c'.repeat(64), normalized: 'text-old' },
      ],
    };
    const normalize = vi.fn((source) => decodeProviderContent(source.content));
    const collector = new SourceSnapshotCollector(baseline, normalize);

    collector.applyPage([indexedContent('post:1', 'grid', 'd'.repeat(64))], sourceIndexPage(1, {
      mode: 'delta', base_revision: revision, examined: 2, unchanged: 1, deleted: ['post:3'],
    }), false);

    expect(collector.finish()).toEqual({
      scope: baseline.scope,
      revision: nextRevision,
      sources: [
        { source_id: 'post:1', source_hash: 'd'.repeat(64), normalized: 'grid' },
        baseline.sources[1],
      ],
    });
    expect(normalize).toHaveBeenCalledTimes(1);
    expect(baseline.sources.map((source) => source.normalized)).toEqual(['flex', 'p-4', 'text-old']);
  });

  it('preserves an explicitly empty replacement and applies deletions', () => {
    const collector = new SourceSnapshotCollector(snapshot, (source) => decodeProviderContent(source.content));
    collector.applyPage([indexedContent('post:1', '')], sourceIndexPage(1, {
      mode: 'delta', base_revision: revision,
    }), false);
    expect(collector.finish().sources[0].normalized).toBe('');

    const deletion = new SourceSnapshotCollector(snapshot, (source) => source.content);
    deletion.applyPage([], sourceIndexPage(0, {
      mode: 'delta', base_revision: revision, deleted: ['post:1'],
    }), false);
    expect(deletion.finish().sources).toEqual([]);
  });

  it('clears an expired or incompatible baseline when the server returns a snapshot', () => {
    const collector = new SourceSnapshotCollector(snapshot, (source) => decodeProviderContent(source.content));
    collector.applyPage([indexedContent('post:2', 'new-source')], sourceIndexPage(1, {
      scope: 'new-scope',
    }), false);
    expect(collector.finish().sources.map((source) => source.source_id)).toEqual(['post:2']);
    expect(collector.finish().scope).toBe('new-scope');
  });

  it('assembles multiple pages and does not expose a partial snapshot', () => {
    const collector = new SourceSnapshotCollector(null, (source) => decodeProviderContent(source.content));
    collector.applyPage([indexedContent('post:1', 'flex')], sourceIndexPage(1, { revision: null }), 'next');
    expect(() => collector.finish()).toThrow('not completed');
    collector.applyPage([indexedContent('post:2', 'grid')], sourceIndexPage(1), false);
    expect(collector.finish().sources.map((source) => source.normalized)).toEqual(['flex', 'grid']);
  });

  it('rejects deltas without their exact baseline and scope', () => {
    for (const baseline of [null, { ...snapshot, revision: nextRevision }, { ...snapshot, scope: 'other-scope' }]) {
      const collector = new SourceSnapshotCollector(baseline, (source) => source.content);
      expect(() => collector.applyPage([], sourceIndexPage(0, {
        mode: 'delta', base_revision: revision, examined: 1, unchanged: 1,
      }), false)).toThrow('does not match');
    }
  });

  it.each([
    { revision: null },
    { deleted: ['post:1', 'post:1'] },
    { changed: 3 },
    { examined: -1 },
    { version: 2 },
  ])('rejects malformed terminal metadata: %s', (overrides) => {
    const collector = new SourceSnapshotCollector(null, (source) => source.content);
    expect(() => collector.applyPage([], sourceIndexPage(0, overrides), false)).toThrow();
  });

  it('rejects premature revisions and deletions', () => {
    for (const metadata of [
      sourceIndexPage(0),
      sourceIndexPage(0, { revision: null, deleted: ['post:1'] }),
    ]) {
      const collector = new SourceSnapshotCollector(null, (source) => source.content);
      expect(() => collector.applyPage([], metadata, 'next')).toThrow('metadata');
    }
  });

  it('rejects changed context and repeated source IDs across pages', () => {
    for (const metadata of [sourceIndexPage(1, { scope: 'new-scope' }), sourceIndexPage(1)]) {
      const collector = new SourceSnapshotCollector(null, (source) => source.content);
      collector.applyPage([indexedContent('post:1', 'flex')], sourceIndexPage(1, { revision: null }), 'next');
      expect(() => collector.applyPage([indexedContent('post:1', 'grid')], metadata, false)).toThrow();
    }
  });

  it('rejects incomplete cached snapshots and conflicting tombstones', () => {
    const missing = new SourceSnapshotCollector({ ...snapshot, sources: [] }, (source) => source.content);
    expect(() => missing.applyPage([], sourceIndexPage(0, {
      mode: 'delta', base_revision: revision, examined: 1, unchanged: 1,
    }), false)).toThrow('incomplete');

    const conflict = new SourceSnapshotCollector(snapshot, (source) => source.content);
    expect(() => conflict.applyPage([indexedContent('post:1', 'grid')], sourceIndexPage(1, {
      mode: 'delta', base_revision: revision, deleted: ['post:1'],
    }), false)).toThrow('conflicting');
  });
});

describe('provider source decoding', () => {
  it('accepts provider contents with an omitted or null type', () => {
    expect(isProviderContents([{ content: 'ZmxleA==', type: null }, { content: 'ZmxleA==' }])).toBe(true);
  });

  it('preserves Unicode arbitrary values through the actual Oxide parser', () => {
    initSync({ module: readFileSync(new URL('../../oxide-parser/pkg/oxide_parser_bg.wasm', import.meta.url)) });
    const html = `<div class="before:content-['✓'] font-[café]"></div>`;
    const encoded = Buffer.from(html, 'utf8').toString('base64');
    const decoded = decodeProviderContent(encoded);

    expect(decoded).toBe(html);
    expect(new Set(getCandidates(decoded))).toEqual(
      new Set(['class', "before:content-['✓']", 'font-[café]']),
    );
  });

  it('rejects invalid base64 and invalid UTF-8', () => {
    expect(() => decodeProviderContent('!')).toThrow();
    expect(() => decodeProviderContent('/w==')).toThrow();
  });
});

describe('provider request scheduling', () => {
  it('limits active providers to two and preserves provider order', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapConcurrent([1, 2, 3, 4, 5], async (value) => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      return value * 2;
    });

    expect(peak).toBe(2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it('aborts in-flight work and does not start queued providers after failure', async () => {
    const failure = new Error('Provider failed');
    const started: number[] = [];
    let aborted = false;
    const operation = mapConcurrent([1, 2, 3], async (value, signal) => {
      started.push(value);
      if (value === 1) {
        await Promise.resolve();
        throw failure;
      }

      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(signal.reason);
        }, { once: true });
      });
      return value;
    });

    await expect(operation).rejects.toBe(failure);
    expect(started).toEqual([1, 2]);
    expect(aborted).toBe(true);
  });

  it('preserves opaque and numeric cursor values', () => {
    expect(readScanCursor('opaque-cursor')).toBe('opaque-cursor');
    expect(readScanCursor(2)).toBe(2);
    expect(readScanCursor(0)).toBe(0);
    expect(readScanCursor(false)).toBe(false);
    expect(() => readScanCursor(true)).toThrow();
    expect(() => readScanCursor({ page: 2 })).toThrow();
  });
});
