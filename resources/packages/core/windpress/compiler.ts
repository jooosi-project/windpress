import { encodeBase64 } from '@std/encoding/base64';
import { unescape } from '@std/html/entities';
import { stringify as stringifyYaml } from 'yaml';
import { nanoid } from 'nanoid';
import { get } from 'lodash-es';
import { createStore, get as getIdb, setMany as setIdbMany } from 'idb-keyval';

import { createLogComposable } from '@/dashboard/stores/log';
import { useApi } from '@/dashboard/library/api';
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
import type { ProviderContent, ScanCursor, SourceCacheSession, SourceSnapshot } from './scanner';

const provider_cache_store = createStore("windpress-cache-store", "provider-cache");

// TODO: Add option to allow enable/disable the incremental cache build

export type Provider = {
  callback?: string;
  description?: string;
  enabled: boolean;
  id: string;
  name: string;
  source_index?: number;
};

export type CSS_Cache = {
  generation: string;
  source_revision: string;
  last_generated: number | null;
  last_full_build: number | null;
  file_url: string | null;
  file_size: number | null;
};

export type BuildCacheOptions = {
  // Should the cache be stored on the server?
  store?: boolean;

  // The Tailwind CSS version to use. If not set, it will be pulled from the server, if failed, it will default to 4
  tailwindcss_version?: 3 | 4;

  // Full or incremental cache build. "Full" will scan all providers, while "Incremental" will use the stored sources on the browser's local storage (if available)
  kind?: "full" | "incremental";

  // The sources to use for the incremental cache build. By default, the sources will be pulled from the browser's local storage
  incremental?: {
    // Provider hints from editor integrations. Every provider is checked for changes.
    providers?: string[];

    // The sources to use for the incremental cache build. Use this to include extra sources that are not part of the providers
    sources?: string[];
  };

  // Should the sourcemap be generated?
  sourcemap?: boolean;
};

export async function buildCache(opts: BuildCacheOptions = {}) {
  const api = useApi();
  const log = createLogComposable();

  log.add({ message: "Starting cache build...", type: "info" });

  const options: BuildCacheOptions = Object.assign(
    {
      store: true,
      kind: "full",
    },
    opts,
  );
  const kind = options.kind ?? 'full';

  let providers: Provider[] = [];
  let volume: { [key: string]: string } = {};

  let css_cache: CSS_Cache = {
    generation: '',
    source_revision: '',
    last_generated: null,
    last_full_build: null,
    file_url: null,
    file_size: 0,
  };
  let idb_unavailable_logged = false;

  async function getProviderCache(key: string) {
    try {
      return await getIdb(key, provider_cache_store);
    } catch {
      if (!idb_unavailable_logged) {
        log.add({
          message: "IndexedDB cache is unavailable. Falling back to provider scanning.",
          type: "warning",
        });
        idb_unavailable_logged = true;
      }

      return null;
    }
  }

  log.add({ message: "Getting the latest Simple File System data...", type: "info" });

  await api.get("admin/settings/cache/providers").then((resp) => {
    providers = resp.data.providers;
  });

  await api.get("admin/settings/cache/index").then((resp: { data: { cache: CSS_Cache } }) => {
    css_cache = resp.data.cache;
  });

  const generation = css_cache.generation;
  const sourceRevision = css_cache.source_revision;
  if (typeof generation !== 'string' || !generation) {
    throw new Error('The server did not return a valid cache generation. Reload WindPress and retry.');
  }
  if (typeof sourceRevision !== 'string' || !sourceRevision) {
    throw new Error('The server did not return a valid source revision. Reload WindPress and retry.');
  }

  await api
    .request("/admin/volume/index", { method: "GET" })
    .then((response) => response.data)
    .then(
      (res: {
        entries: Array<{ relative_path: string; content: string; directory?: boolean }>;
      }) => {
        volume = res.entries.reduce((acc: { [key: string]: string }, entry) => {
          if (!entry.directory) {
            acc[`/${entry.relative_path}`] = entry.content;
          }
          return acc;
        }, {});
      },
    );

  // if the version or the sourcemap is not set, then get the setting from the server
  if (!options.tailwindcss_version || typeof options.sourcemap !== "boolean") {
    await api.request("/admin/settings/options/index", { method: "GET" }).then((response) => {
      const version = Number(get(response.data.options, "general.tailwindcss.version", 4));
      const sourcemap = Boolean(get(response.data.options, "performance.cache.source_map", false));
      if (version === 3 || version === 4) {
        options.tailwindcss_version = version;
        options.sourcemap = sourcemap;
      } else {
        options.tailwindcss_version = 4;
        options.sourcemap = false;
      }
    });
  }

  if (providers.length === 0 || providers.filter((provider) => provider.enabled).length === 0) {
    log.add({
      message:
        "No scanner provider found. If this is unexpected, please check the integrations setting page.",
      type: "warning",
    });

    // throw new Error('No cache provider found');
  }

  const pendingCaches = new Map<string, SourceSnapshot>();
  const sourceCacheSession: SourceCacheSession = { read: readSourceCache, stage: stageSourceCache };

  async function readSourceCache(key: string) {
    const storedCache = await getProviderCache(key);
    const cache = readProviderCache(storedCache, generation);
    if (storedCache && !cache.success) {
      log.add({ message: `${cache.message} Scanning again.`, type: 'info' });
    }
    return cache.snapshot;
  }

  function stageSourceCache(key: string, snapshot: SourceSnapshot) {
    pendingCaches.set(key, snapshot);
  }

  function normalizeProviderContent(source: ProviderContent) {
    let content = decodeProviderContent(source.content);
    if (source.type === 'json') {
      content = stringifyYaml(JSON.parse(content));
    }
    return unescape(content);
  }

  async function fetchProviderContents(provider: Provider, signal: AbortSignal) {
    let batch: ScanCursor = false;
    const seenCursors = new Set<ScanCursor>();
    const sourceContents: string[] = [];
    const cacheKey = providerCacheKey(api.defaults.baseURL || '', provider.id);
    const indexed = provider.source_index === 1;
    const baseline = indexed && kind === 'incremental' ? await readSourceCache(cacheKey) : null;
    signal.throwIfAborted();
    const collector = indexed ? new SourceSnapshotCollector(baseline, normalizeProviderContent) : null;

    // Redaxios exposes a fetch override but does not forward an AbortSignal itself.
    function fetchScan(input: RequestInfo | URL, init?: RequestInit) {
      return (api.defaults.fetch || fetch)(input, { ...init, signal });
    }

    do {
      signal.throwIfAborted();
      seenCursors.add(batch);
      const logId = nanoid(10);
      const logMessage = `Scanning provider: ${provider.name}... (${batch !== false ? batch : 'initial'})`;
      log.add({ message: logMessage, type: 'info', id: logId });

      try {
        const response = await api.post('admin/settings/cache/providers/scan', {
          provider_id: provider.id,
          metadata: {
            next_batch: batch,
            generation,
            source_revision: sourceRevision,
            kind,
            ...(indexed ? { source_index: { version: 1, baseline: baseline?.revision ?? null } } : {}),
          },
        }, { fetch: fetchScan });
        signal.throwIfAborted();
        const scan = response.data;

        if (scan.metadata?.generation !== generation) {
          throw new Error('The cache generation changed during scanning. Retry the build.');
        }
        if (scan.metadata?.source_revision !== sourceRevision) {
          throw new Error('The source revision changed during scanning. Retry the build.');
        }
        batch = readScanCursor(scan.metadata?.next_batch);
        if (batch !== false && seenCursors.has(batch)) {
          throw new Error('The scanner returned a repeated continuation cursor.');
        }

        if (collector) {
          collector.applyPage(scan.contents, scan.metadata?.source_index, batch);
        } else {
          if (!isProviderContents(scan.contents)) {
            throw new Error('The scanner returned invalid source contents.');
          }
          sourceContents.push(...scan.contents.map(normalizeProviderContent));
        }
        log.update(logId, { type: 'info', message: `${logMessage} - done` });
      } catch (error) {
        const message = get(error, 'data.message', get(error, 'message', 'Unknown scan error'));
        log.update(logId, { type: 'error', message: `${logMessage} - failed: ${message}` });
        throw error;
      }
    } while (batch !== false);

    if (collector) {
      const snapshot = collector.finish();
      stageSourceCache(cacheKey, snapshot);
      return snapshot.sources.map((source) => source.normalized);
    }
    return sourceContents;
  }

  let providerContents: string[][];
  try {
    providerContents = await mapConcurrent(
      providers.filter((provider) => provider.enabled),
      fetchProviderContents,
    );
  } catch (error) {
    log.add({ message: 'Canceling cache build...', type: 'info' });
    throw error;
  }

  const contents = providerContents.flat();
  if (kind === 'incremental' && options.incremental?.sources) {
    contents.push(...options.incremental.sources);
  }

  let normal = null;
  let minified = null;
  let sourcemap = null;

  if (options.tailwindcss_version === 4) {
    // import the modules dynamically to avoid bundling them in the main bundle
    const {
      compile: buildV4,
      getCandidates,
      optimize: optimizeV4,
      loadSource,
    } = await import("@/packages/core/tailwindcss");

    const compiled = await buildV4({
      entrypoint: "/main.css",
      volume,
    });

    const candidates: string[] = await getCandidates([
      ...contents,
      ...(await loadSource(compiled.sources, { kind, sourceRevision, indexedCache: sourceCacheSession })),
    ]);

    log.add({ message: "Scanning complete", type: "success" });

    log.add({
      message: `Found ${candidates.length} candidates`,
      type: "info",
      options: { raw: true, candidates: candidates.sort() },
    });

    log.add({ message: "Building cache...", type: "info" });

    const result = compiled.build(candidates);

    let map = null;
    if (options.sourcemap === true) {
      map = compiled.buildSourceMap();
    }

    const optimized = await optimizeV4(result, { file: "main.css", map: map ?? undefined });
    const optimizedMin = await optimizeV4(result, {
      file: "main.css",
      map: map ?? undefined,
      minify: true,
    });

    normal = optimized.code;
    sourcemap = optimized.map;
    minified = optimizedMin.code;
  } else if (options.tailwindcss_version === 3) {
    // import the modules dynamically to avoid bundling them in the main bundle
    const { build: buildV3, optimize: optimizeV3 } = await import("@/packages/core/tailwindcss-v3");

    log.add({ message: "Scanning complete", type: "success" });
    log.add({ message: "Building cache...", type: "info" });

    const result = await buildV3({
      entrypoint: {
        css: "/main.css",
        config: "/tailwind.config.js",
      },
      contents,
      volume,
    });

    normal = (await optimizeV3(result)).css;
    minified = (await optimizeV3(result, true)).css;
  }

  log.add({ message: "Cache built", type: "success" });

  css_cache.last_generated = Date.now();
  css_cache.last_full_build = kind === 'full' ? Date.now() : css_cache.last_full_build;

  // store to server?
  if (options.store === true) {
    await api
      .post("admin/settings/cache/store", {
        // @see https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
        content: encodeBase64((sourcemap ? normal : minified) || ""),
        sourcemap: sourcemap ? encodeBase64(sourcemap) : null,
        full_build: kind === 'full',
        expected_generation: generation,
        expected_source_revision: sourceRevision,
      })
      .then((resp) => {
        css_cache = resp.data.cache;
        log.add({ message: "Cache stored", type: "success" });
      });

    try {
      if (typeof css_cache.generation !== 'string' || !css_cache.generation) {
        throw new Error('The server did not return the published cache generation.');
      }

      const entries: [IDBValidKey, string][] = Array.from(pendingCaches, ([key, snapshot]) => [
        key,
        encodeProviderCache(snapshot, css_cache.generation),
      ]);

      if (entries.length > 0) {
        await setIdbMany(entries, provider_cache_store);
      }
    } catch {
      log.add({
        message: 'CSS was stored, but provider sources could not be cached. The next build will scan them again.',
        type: 'warning',
      });
    }
  }

  return {
    normal: normal,
    sourcemap: sourcemap,
    minified: minified,
    css_cache: css_cache,
  };
}
