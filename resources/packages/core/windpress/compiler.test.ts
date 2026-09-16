import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compressToUTF16 } from '@windpress/lz-string';

import { buildCache } from './compiler';
import { encodeProviderCache, providerCacheKey, readProviderCache } from './scanner';
import type { SourceCacheSession, SourceSnapshot } from './scanner';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
  readCache: vi.fn(),
  writeCaches: vi.fn(),
  compile: vi.fn(),
  getCandidates: vi.fn(),
  loadSource: vi.fn(),
  optimize: vi.fn(),
  log: { add: vi.fn(), update: vi.fn() },
}));

vi.mock('@/dashboard/library/api', () => ({
  useApi: () => ({
    defaults: { baseURL: 'https://example.test/site-a/wp-json/windpress/v1' },
    get: mocks.get,
    post: mocks.post,
    request: mocks.request,
  }),
}));
vi.mock('@/dashboard/stores/log', () => ({ createLogComposable: () => mocks.log }));
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  get: mocks.readCache,
  setMany: mocks.writeCaches,
}));
vi.mock('@/packages/core/tailwindcss', () => ({
  compile: mocks.compile,
  getCandidates: mocks.getCandidates,
  loadSource: mocks.loadSource,
  optimize: mocks.optimize,
}));

const options = { tailwindcss_version: 4, sourcemap: false } as const;
const source = `<div class="before:content-['✓'] font-[café]"></div>`;
const revision = '1'.repeat(64);
const nextRevision = '2'.repeat(64);
const sourceHash = 'a'.repeat(64);
const contents = [{ source_id: 'post:1', source_hash: sourceHash, content: Buffer.from(source).toString('base64'), type: 'html' }];
const snapshot: SourceSnapshot = {
  scope: 'provider-scope',
  revision,
  sources: [{ source_id: 'post:1', source_hash: sourceHash, normalized: source }],
};
let currentGeneration: string;
let currentSourceRevision: string;

function cacheState() {
  return {
    generation: currentGeneration,
    source_revision: currentSourceRevision,
    last_generated: null,
    last_full_build: Date.now() + 60_000,
    file_url: null,
    file_size: 0,
  };
}

function scanResponse(
  nextBatch: string | number | false = false,
  generation = currentGeneration,
  overrides: { contents?: typeof contents; sourceIndex?: Record<string, unknown> } = {},
) {
  return { data: {
    contents: overrides.contents ?? contents,
    metadata: {
      generation,
      source_revision: currentSourceRevision,
      next_batch: nextBatch,
      source_index: {
        version: 1,
        mode: 'snapshot',
        scope: snapshot.scope,
        base_revision: null,
        revision: nextBatch === false ? revision : null,
        deleted: [],
        examined: overrides.contents?.length ?? contents.length,
        changed: overrides.contents?.length ?? contents.length,
        unchanged: 0,
        ...overrides.sourceIndex,
      },
    },
  } };
}

beforeEach(() => {
  vi.resetAllMocks();
  currentGeneration = 'initial-generation';
  currentSourceRevision = 'initial-source-revision';
  mocks.get.mockImplementation(async (url: string) => {
    if (url.endsWith('/providers')) {
      return { data: { providers: [
        { id: 'a', name: 'Provider A', enabled: true, source_index: 1 },
        { id: 'b', name: 'Provider B', enabled: true, source_index: 1 },
      ] } };
    }
    return { data: { cache: cacheState() } };
  });
  mocks.request.mockResolvedValue({ data: { entries: [{ relative_path: 'main.css', content: '@tailwind utilities;' }] } });
  mocks.post.mockImplementation(async (url: string, payload: { full_build?: boolean; metadata?: { source_index?: { baseline: string | null } } }) => {
    if (url.endsWith('/scan')) {
      const baseline = payload.metadata?.source_index?.baseline;
      if (baseline) {
        return scanResponse(false, currentGeneration, {
          contents: [],
          sourceIndex: { mode: 'delta', base_revision: baseline, examined: 1, unchanged: 1 },
        });
      }
      return scanResponse();
    }
    if (payload.full_build) {
      currentGeneration = 'published-generation';
    }
    return { data: { cache: cacheState() } };
  });
  mocks.compile.mockResolvedValue({
    sources: [],
    build: () => '.flex { display: flex; }',
  });
  mocks.getCandidates.mockResolvedValue(['flex']);
  mocks.loadSource.mockResolvedValue([]);
  mocks.optimize.mockResolvedValue({ code: '.flex{display:flex;}' });
});

describe('cache build publication', () => {
  it('commits source caches using the returned generation only after CSS publication', async () => {
    const result = await buildCache(options);

    expect(mocks.getCandidates).toHaveBeenCalledWith([source, source]);
    expect(mocks.post).toHaveBeenCalledWith('admin/settings/cache/store', expect.objectContaining({
      expected_generation: 'initial-generation',
      expected_source_revision: 'initial-source-revision',
      full_build: true,
    }));
    expect(result.css_cache.generation).toBe('published-generation');
    expect(mocks.writeCaches).toHaveBeenCalledTimes(1);
    expect(mocks.writeCaches.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.post.mock.invocationCallOrder.at(-1)!,
    );

    const entries: [string, string][] = mocks.writeCaches.mock.calls[0][0];
    expect(entries).toHaveLength(2);
    for (const [key, value] of entries) {
      expect(key).toContain('https://example.test/site-a/wp-json/windpress/v1');
      expect(readProviderCache(value, 'published-generation')).toEqual({ success: true, snapshot });
      expect(readProviderCache(value, 'initial-generation').success).toBe(false);
    }
  });

  it('checks every provider and reuses unchanged normalized sources immediately after a full build', async () => {
    await buildCache(options);
    const entries: [string, string][] = mocks.writeCaches.mock.calls[0][0];
    const cache = new Map(entries);
    mocks.readCache.mockImplementation(async (key: string) => cache.get(key));
    mocks.post.mockClear();

    await buildCache({ ...options, kind: 'incremental', incremental: { providers: ['a'] } });

    const scans = mocks.post.mock.calls.filter(([url]) => url.endsWith('/scan'));
    expect(scans).toHaveLength(2);
    expect(scans[0][1]).toEqual({
      provider_id: 'a',
      metadata: {
        next_batch: false,
        generation: 'published-generation',
        source_revision: currentSourceRevision,
        kind: 'incremental',
        source_index: { version: 1, baseline: revision },
      },
    });
    expect(scans[1][1].provider_id).toBe('b');
    expect(mocks.getCandidates).toHaveBeenLastCalledWith([source, source]);
  });

  it('rescans an outdated or corrupt provider cache', async () => {
    mocks.readCache.mockImplementation(async (key: string) => (
      key === providerCacheKey('https://example.test/site-a/wp-json/windpress/v1', 'a')
        ? encodeProviderCache(snapshot, 'older-generation')
        : 'corrupt source cache'
    ));

    await buildCache({ ...options, kind: 'incremental', incremental: { providers: [] } });

    expect(mocks.post.mock.calls.filter(([url]) => url.endsWith('/scan'))).toHaveLength(2);
  });

  it('merges another device\'s changed source even when the editor hints at a different provider', async () => {
    mocks.readCache.mockResolvedValue(encodeProviderCache(snapshot, currentGeneration));
    mocks.post.mockImplementation(async (url: string, payload: { provider_id?: string }) => {
      if (url.endsWith('/store')) {
        return { data: { cache: cacheState() } };
      }
      const changed = payload.provider_id === 'b';
      return scanResponse(false, currentGeneration, {
        contents: changed ? [{ ...contents[0], source_hash: 'b'.repeat(64), content: btoa('text-from-other-device') }] : [],
        sourceIndex: {
          mode: 'delta', base_revision: revision, revision: changed ? nextRevision : revision,
          examined: 1, unchanged: changed ? 0 : 1,
        },
      });
    });

    await buildCache({ ...options, kind: 'incremental', incremental: { providers: ['a'] } });

    expect(mocks.getCandidates).toHaveBeenCalledWith([source, 'text-from-other-device']);
    const entries: [string, string][] = mocks.writeCaches.mock.calls[0][0];
    const updated = entries.find(([key]) => key === providerCacheKey('https://example.test/site-a/wp-json/windpress/v1', 'b'))!;
    expect(readProviderCache(updated[1], currentGeneration).snapshot?.revision).toBe(nextRevision);
  });

  it('removes deleted sources from compilation and the next browser baseline', async () => {
    mocks.readCache.mockResolvedValue(encodeProviderCache(snapshot, currentGeneration));
    mocks.post.mockImplementation(async (url: string, payload: { provider_id?: string }) => {
      if (url.endsWith('/store')) {
        return { data: { cache: cacheState() } };
      }
      const deleted = payload.provider_id === 'b';
      return scanResponse(false, currentGeneration, {
        contents: [],
        sourceIndex: {
          mode: 'delta', base_revision: revision, revision: nextRevision,
          examined: deleted ? 0 : 1, unchanged: deleted ? 0 : 1, deleted: deleted ? ['post:1'] : [],
        },
      });
    });

    await buildCache({ ...options, kind: 'incremental' });

    expect(mocks.getCandidates).toHaveBeenCalledWith([source]);
    const entries: [string, string][] = mocks.writeCaches.mock.calls[0][0];
    const updated = entries.find(([key]) => key === providerCacheKey('https://example.test/site-a/wp-json/windpress/v1', 'b'))!;
    expect(readProviderCache(updated[1], currentGeneration).snapshot?.sources).toEqual([]);
  });

  it('rebuilds from an explicit snapshot after the server expires the baseline', async () => {
    mocks.readCache.mockResolvedValue(encodeProviderCache(snapshot, currentGeneration));
    mocks.post.mockImplementation(async (url: string) => (
      url.endsWith('/store') ? { data: { cache: cacheState() } } : scanResponse(false, currentGeneration, {
        contents: [{ ...contents[0], source_id: 'post:2', content: btoa('new-only') }],
        sourceIndex: { scope: 'new-provider-scope' },
      })
    ));

    await buildCache({ ...options, kind: 'incremental' });

    expect(mocks.getCandidates).toHaveBeenCalledWith(['new-only', 'new-only']);
  });

  it('fully fetches legacy providers on every build instead of reusing a provider-level cache', async () => {
    mocks.get.mockImplementation(async (url: string) => (
      url.endsWith('/providers')
        ? { data: { providers: [{ id: 'legacy', name: 'Legacy', enabled: true }] } }
        : { data: { cache: cacheState() } }
    ));
    mocks.readCache.mockResolvedValue(encodeProviderCache(snapshot, currentGeneration));

    await buildCache({ ...options, kind: 'incremental', incremental: { providers: [] } });
    await buildCache({ ...options, kind: 'incremental', incremental: { providers: [] } });

    const scans = mocks.post.mock.calls.filter(([url]) => url.endsWith('/scan'));
    expect(scans).toHaveLength(2);
    expect(scans.every(([, payload]) => !('source_index' in payload.metadata))).toBe(true);
    expect(mocks.readCache).not.toHaveBeenCalled();
    expect(mocks.writeCaches).not.toHaveBeenCalled();
  });

  it('commits provider and local-file snapshots in the same transaction', async () => {
    mocks.loadSource.mockImplementation(async (_sources: unknown, lifecycle: { indexedCache: SourceCacheSession; sourceRevision: string }) => {
      expect(lifecycle.sourceRevision).toBe(currentSourceRevision);
      lifecycle.indexedCache.stage('local-files-key', { ...snapshot, scope: 'local-file-scope' });
      expect(mocks.writeCaches).not.toHaveBeenCalled();
      return ['local-file-source'];
    });

    await buildCache(options);

    expect(mocks.writeCaches).toHaveBeenCalledTimes(1);
    const entries: [string, string][] = mocks.writeCaches.mock.calls[0][0];
    expect(entries).toHaveLength(3);
    expect(readProviderCache(entries.find(([key]) => key === 'local-files-key')![1], currentGeneration).snapshot?.scope).toBe('local-file-scope');
  });

  it('does not commit any staged file or provider snapshots after a later source failure', async () => {
    mocks.loadSource.mockImplementation(async (_sources: unknown, lifecycle: { indexedCache: SourceCacheSession }) => {
      lifecycle.indexedCache.stage('local-files-key', snapshot);
      throw new Error('Remote source unavailable');
    });

    await expect(buildCache(options)).rejects.toThrow('Remote source unavailable');

    expect(mocks.writeCaches).not.toHaveBeenCalled();
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/store'))).toBe(false);
  });

  it('does not update published-generation provider caches for a preview', async () => {
    await buildCache({ ...options, store: false });

    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/store'))).toBe(false);
    expect(mocks.writeCaches).not.toHaveBeenCalled();
  });

  it('rescans a cache containing invalid normalized source data', async () => {
    mocks.readCache.mockResolvedValue(compressToUTF16(JSON.stringify({
      version: 2,
      generation: currentGeneration,
      snapshot: { ...snapshot, sources: [{ ...snapshot.sources[0], normalized: null }] },
    })));

    await buildCache({ ...options, kind: 'incremental', incremental: { providers: [] } });

    expect(mocks.post.mock.calls.filter(([url]) => url.endsWith('/scan'))).toHaveLength(2);
    expect(mocks.getCandidates).toHaveBeenCalledWith([source, source]);
  });

  it('includes caller-supplied incremental sources', async () => {
    await buildCache({ ...options, kind: 'incremental', incremental: { sources: ['text-xl'] } });

    expect(mocks.getCandidates).toHaveBeenCalledWith([source, source, 'text-xl']);
  });

  it('does not save partial provider caches if a later scan batch fails', async () => {
    mocks.post.mockImplementation(async (_url: string, payload: { provider_id: string; metadata: { next_batch: unknown } }) => {
      if (payload.provider_id === 'a' && payload.metadata.next_batch === false) {
        return scanResponse('page-2');
      }
      if (payload.provider_id === 'a') {
        throw new Error('Page two failed');
      }
      return scanResponse();
    });

    await expect(buildCache(options)).rejects.toThrow('Page two failed');

    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/store'))).toBe(false);
    expect(mocks.compile).not.toHaveBeenCalled();
    expect(mocks.writeCaches).not.toHaveBeenCalled();
  });

  it('does not cache sources when compilation fails', async () => {
    mocks.compile.mockRejectedValue(new Error('Invalid CSS'));

    await expect(buildCache(options)).rejects.toThrow('Invalid CSS');

    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/store'))).toBe(false);
    expect(mocks.writeCaches).not.toHaveBeenCalled();
  });

  it('forwards cancellation through the API fetch override and stops queued providers', async () => {
    const failure = new Error('Provider A failed');
    const requested: string[] = [];
    const signals: AbortSignal[] = [];
    mocks.get.mockImplementation(async (url: string) => (
      url.endsWith('/providers')
        ? { data: { providers: ['a', 'b', 'c'].map((id) => ({ id, name: id, enabled: true })) } }
        : { data: { cache: cacheState() } }
    ));
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      requested.push(url);
      const signal = init.signal!;
      signals.push(signal);
      if (url.endsWith('/a')) {
        await Promise.resolve();
        throw failure;
      }
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
      return new Response('{}');
    }));
    mocks.post.mockImplementation(async (
      _url: string,
      payload: { provider_id: string },
      config: { fetch: typeof fetch },
    ) => {
      const response = await config.fetch(`https://example.test/${payload.provider_id}`);
      return { data: await response.json() };
    });

    try {
      await expect(buildCache(options)).rejects.toBe(failure);
      expect(requested).toEqual(['https://example.test/a', 'https://example.test/b']);
      expect(signals.every((signal) => signal.aborted)).toBe(true);
      expect(mocks.writeCaches).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not cache sources when publication rejects a stale generation', async () => {
    mocks.post.mockImplementation(async (url: string) => {
      if (url.endsWith('/store')) {
        throw new Error('Generation conflict');
      }
      return scanResponse();
    });

    await expect(buildCache(options)).rejects.toThrow('Generation conflict');

    expect(mocks.writeCaches).not.toHaveBeenCalled();
  });

  it('rejects a scan response from a different generation', async () => {
    mocks.post.mockResolvedValue(scanResponse(false, 'changed-generation'));

    await expect(buildCache(options)).rejects.toThrow('generation changed');

    expect(mocks.writeCaches).not.toHaveBeenCalled();
    expect(mocks.compile).not.toHaveBeenCalled();
  });

  it('rejects a scan response from a different source revision', async () => {
    const response = scanResponse();
    response.data.metadata.source_revision = 'changed-source-revision';
    mocks.post.mockResolvedValue(response);

    await expect(buildCache(options)).rejects.toThrow('source revision changed');

    expect(mocks.writeCaches).not.toHaveBeenCalled();
    expect(mocks.compile).not.toHaveBeenCalled();
  });

  it('stops repeated continuation cursors without publishing a partial build', async () => {
    mocks.post.mockResolvedValue(scanResponse('same-cursor'));

    await expect(buildCache(options)).rejects.toThrow('repeated continuation cursor');

    expect(mocks.post.mock.calls.length).toBeLessThanOrEqual(4);
    expect(mocks.writeCaches).not.toHaveBeenCalled();
  });
});
