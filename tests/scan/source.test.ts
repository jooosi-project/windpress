import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadSource } from '@/packages/core/tailwindcss/source';
import type { Source } from '@/packages/core/tailwindcss/source';
import type { SourceSnapshot } from '@/packages/core/windpress/scanner';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  log: {
    add: vi.fn(),
    logs: { value: [] as Array<{ id: string; message: string }> },
  },
}));

vi.mock('@/dashboard/library/api', () => ({ useApi: () => ({ post: mocks.post }) }));
vi.mock('@/dashboard/stores/log', () => ({ createLogComposable: () => mocks.log }));

function localSource(pattern: string, negated = false): Source {
  return { base: '/', pattern: `wp-content:${pattern}`, negated };
}

function scanResponse(contents: string[] = [], nextCursor: unknown = false) {
  return {
    data: {
      contents: contents.map((content) => ({ content })),
      metadata: { next_batch: nextCursor },
    },
  };
}

const firstRevision = 'a'.repeat(64);
const secondRevision = 'b'.repeat(64);
const firstHash = 'c'.repeat(64);
const secondHash = 'd'.repeat(64);

function indexedResponse(
  contents: Array<{ source_id: string; content: string; source_hash: string }>,
  options: {
    cursor?: string | false;
    mode?: 'snapshot' | 'delta';
    baseline?: string | null;
    deleted?: string[];
    unchanged?: number;
  } = {},
) {
  const cursor = options.cursor ?? false;
  return {
    data: {
      contents,
      metadata: {
        next_batch: cursor,
        source_revision: 'content-revision',
        source_index: {
          version: 1,
          mode: options.mode ?? 'snapshot',
          scope: 'local-files',
          base_revision: options.baseline ?? null,
          revision: cursor === false ? secondRevision : null,
          deleted: options.deleted ?? [],
          examined: contents.length + (options.unchanged ?? 0),
          changed: contents.length,
          unchanged: options.unchanged ?? 0,
        },
      },
    },
  };
}

function cacheSession(baseline: SourceSnapshot | null = null) {
  return { read: vi.fn().mockResolvedValue(baseline), stage: vi.fn() };
}

function cachedSnapshot(): SourceSnapshot {
  return {
    scope: 'local-files',
    revision: firstRevision,
    sources: [
      { source_id: 'file:a', source_hash: firstHash, normalized: 'first cached source' },
      { source_id: 'file:b', source_hash: secondHash, normalized: 'second cached source' },
    ],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.log.logs.value = [];
  mocks.post.mockResolvedValue(scanResponse());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('local source scanning', () => {
  it('groups positive patterns and exclusions into one request and removes duplicate patterns', async () => {
    mocks.post.mockResolvedValue(scanResponse(['root source', 'nested source']));

    const result = await loadSource([
      localSource('**/*.php'),
      localSource('themes/demo/**/*.twig'),
      localSource('**/*.php'),
      localSource('**/vendor/**', true),
      localSource('**/vendor/**', true),
    ]);

    expect(result).toEqual(['root source', 'nested source']);
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('admin/local-file-provider/scan', {
      patterns: ['**/*.php', 'themes/demo/**/*.twig'],
      exclude_patterns: ['**/vendor/**'],
      batch: true,
      cursor: false,
    }, { fetch: expect.any(Function) });
  });

  it('does not scan when only negative local sources exist', async () => {
    expect(await loadSource([localSource('**/vendor/**', true)])).toEqual([]);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('continues through empty discovery pages and preserves Unicode source text', async () => {
    mocks.post
      .mockResolvedValueOnce(scanResponse([], 'cursor-one'))
      .mockResolvedValueOnce(scanResponse(['font-[café] before:content-["✓"]'], 'cursor-two'))
      .mockResolvedValueOnce(scanResponse(['last source']));

    const result = await loadSource([localSource('**/*.php'), localSource('vendor/**', true)]);

    expect(result).toEqual(['font-[café] before:content-["✓"]', 'last source']);
    expect(mocks.post.mock.calls.map(([, payload]) => payload.cursor)).toEqual([false, 'cursor-one', 'cursor-two']);
    for (const [, payload] of mocks.post.mock.calls) {
      expect(payload.patterns).toEqual(['**/*.php']);
      expect(payload.exclude_patterns).toEqual(['vendor/**']);
    }
  });

  it('rejects repeated cursors instead of looping', async () => {
    mocks.post.mockResolvedValue(scanResponse(['source'], 'same-cursor'));

    await expect(loadSource([localSource('**/*.php')])).rejects.toThrow('invalid continuation cursor');
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });

  it.each([true, 1, null, ''])('rejects the invalid cursor %s', async (cursor) => {
    mocks.post.mockResolvedValue(scanResponse([], cursor));

    await expect(loadSource([localSource('**/*.php')])).rejects.toThrow('invalid continuation cursor');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('rejects a response missing continuation metadata', async () => {
    mocks.post.mockResolvedValue({ data: { contents: [] } });

    await expect(loadSource([localSource('**/*.php')])).rejects.toThrow('invalid continuation cursor');
  });

  it.each([null, 12, {}, [null], [{ content: null }]])('rejects invalid contents %s', async (contents) => {
    mocks.post.mockResolvedValue({ data: { contents, metadata: { next_batch: false } } });

    await expect(loadSource([localSource('**/*.php')])).rejects.toThrow('invalid source contents');
  });

  it('fails the entire load if a later batch fails', async () => {
    mocks.post
      .mockResolvedValueOnce(scanResponse(['partial source'], 'next-cursor'))
      .mockRejectedValueOnce(new Error('The file scan expired'));

    await expect(loadSource([localSource('**/*.php')])).rejects.toThrow('file scan expired');
  });

  it('continues loading remote sources alongside the grouped local request', async () => {
    const fetch = vi.fn().mockResolvedValue({ text: async () => 'remote source' });
    vi.stubGlobal('fetch', fetch);
    mocks.post.mockResolvedValue(scanResponse(['local source']));

    const result = await loadSource([
      localSource('**/*.php'),
      { base: '/', pattern: 'https://example.test/template.html', negated: false },
    ]);

    expect(result.sort()).toEqual(['local source', 'remote source']);
    expect(fetch).toHaveBeenCalledExactlyOnceWith('https://example.test/template.html');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});

describe('indexed local source scanning', () => {
  it('collects a cold snapshot and stages it only after all pages finish', async () => {
    const session = cacheSession();
    mocks.post
      .mockResolvedValueOnce(indexedResponse([{ source_id: 'file:a', source_hash: firstHash, content: 'font-[café]' }], { cursor: 'next-page' }))
      .mockImplementationOnce(async () => {
        expect(session.stage).not.toHaveBeenCalled();
        return indexedResponse([{ source_id: 'file:b', source_hash: secondHash, content: 'content-["✓"]' }]);
      });

    const contents = await loadSource([localSource('**/*.php')], {
      kind: 'full', sourceRevision: 'content-revision', indexedCache: session,
    });

    expect(contents).toEqual(['font-[café]', 'content-["✓"]']);
    expect(session.read).not.toHaveBeenCalled();
    expect(session.stage).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
      scope: 'local-files', revision: secondRevision,
      sources: [
        { source_id: 'file:a', source_hash: firstHash, normalized: 'font-[café]' },
        { source_id: 'file:b', source_hash: secondHash, normalized: 'content-["✓"]' },
      ],
    });
    for (const [, payload] of mocks.post.mock.calls) {
      expect(payload.source_index).toEqual({ version: 1, baseline: null });
      expect(payload.source_revision).toBe('content-revision');
    }
  });

  it('reuses unchanged source contents after an empty warm delta', async () => {
    const baseline = cachedSnapshot();
    const session = cacheSession(baseline);
    mocks.post.mockResolvedValue(indexedResponse([], { mode: 'delta', baseline: firstRevision, unchanged: 2 }));

    expect(await loadSource([localSource('**/*.php')], { kind: 'incremental', indexedCache: session })).toEqual([
      'first cached source', 'second cached source',
    ]);
    expect(mocks.post.mock.calls[0][1].source_index).toEqual({ version: 1, baseline: firstRevision });
    expect(session.stage.mock.calls[0][1].sources).toEqual(baseline.sources);
  });

  it('replaces edited sources and removes deleted or renamed sources', async () => {
    const baseline = cachedSnapshot();
    const session = cacheSession(baseline);
    mocks.post.mockResolvedValue(indexedResponse([
      { source_id: 'file:a', source_hash: secondHash, content: 'edited source' },
      { source_id: 'file:renamed', source_hash: firstHash, content: 'renamed source' },
    ], { mode: 'delta', baseline: firstRevision, deleted: ['file:b'] }));

    expect(await loadSource([localSource('**/*.php')], { kind: 'incremental', indexedCache: session })).toEqual([
      'edited source', 'renamed source',
    ]);
    expect(baseline.sources.map((source) => source.source_id)).toEqual(['file:a', 'file:b']);
    expect(session.stage.mock.calls[0][1].sources.map((source: { source_id: string }) => source.source_id)).toEqual(['file:a', 'file:renamed']);
  });

  it('replaces stale contents when the server resets an expired or changed scope', async () => {
    const session = cacheSession(cachedSnapshot());
    mocks.post.mockResolvedValue(indexedResponse([{ source_id: 'file:new', source_hash: firstHash, content: 'fresh snapshot' }]));

    expect(await loadSource([localSource('**/*.php'), localSource('vendor/**', true)], {
      kind: 'incremental', indexedCache: session,
    })).toEqual(['fresh snapshot']);
    expect(session.stage.mock.calls[0][1].sources).toHaveLength(1);
  });

  it('normalizes pattern order in cache keys and separates exclusion configurations', async () => {
    const session = cacheSession();
    mocks.post.mockResolvedValue(indexedResponse([]));

    await loadSource([localSource('b/**/*.php'), localSource('a/**/*.php')], { kind: 'incremental', indexedCache: session });
    await loadSource([localSource('a/**/*.php'), localSource('b/**/*.php')], { kind: 'incremental', indexedCache: session });
    await loadSource([localSource('a/**/*.php'), localSource('b/**/*.php'), localSource('vendor/**', true)], { kind: 'incremental', indexedCache: session });

    expect(session.read.mock.calls[0][0]).toBe(session.read.mock.calls[1][0]);
    expect(session.read.mock.calls[0][0]).not.toBe(session.read.mock.calls[2][0]);
  });

  it('does not stage partial snapshots after a later request fails', async () => {
    const session = cacheSession();
    mocks.post
      .mockResolvedValueOnce(indexedResponse([{ source_id: 'file:a', source_hash: firstHash, content: 'partial' }], { cursor: 'next-page' }))
      .mockRejectedValueOnce(new Error('Source scan expired'));

    await expect(loadSource([localSource('**/*.php')], { indexedCache: session })).rejects.toThrow('Source scan expired');
    expect(session.stage).not.toHaveBeenCalled();
  });

  it('rejects changing source revisions and preserves the previous cache', async () => {
    const session = cacheSession();
    mocks.post.mockResolvedValue(indexedResponse([]));

    await expect(loadSource([localSource('**/*.php')], {
      sourceRevision: 'older-revision', indexedCache: session,
    })).rejects.toThrow('Source data changed');
    expect(session.stage).not.toHaveBeenCalled();
  });

  it('stops aborted loads without staging or requesting another page', async () => {
    const session = cacheSession();
    const controller = new AbortController();
    mocks.post.mockImplementationOnce(async () => {
      controller.abort(new Error('Build canceled'));
      return indexedResponse([{ source_id: 'file:a', source_hash: firstHash, content: 'partial' }], { cursor: 'next-page' });
    });

    await expect(loadSource([localSource('**/*.php')], {
      indexedCache: session, signal: controller.signal,
    })).rejects.toThrow('Build canceled');
    expect(session.stage).not.toHaveBeenCalled();
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});
