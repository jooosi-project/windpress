import { minimatch } from "minimatch";
import { createLogComposable } from "@/dashboard/stores/log";
import { useApi } from "@/dashboard/library/api";
import { parse as parsePackageName } from "parse-package-name";
import { SourceSnapshotCollector, sourceCacheKey } from '@/packages/core/windpress/scanner';
import type { SourceCacheSession } from '@/packages/core/windpress/scanner';

export type Source = {
  base: string;
  pattern: string;
  negated: boolean;
};

interface LocalScanResponse {
  contents?: unknown;
  metadata?: { next_batch?: unknown; source_index?: unknown; source_revision?: unknown };
}

export interface LoadSourceOptions {
  kind?: 'full' | 'incremental';
  sourceRevision?: string;
  indexedCache?: SourceCacheSession;
  signal?: AbortSignal;
}

export async function loadSource(sources: Source[], options: LoadSourceOptions = {}) {
  const logStore = createLogComposable();

  const contents: string[] = [];
  const localSources = sources.filter((source) => source.pattern.startsWith("wp-content:"));

  const promises = sources.map(async (source) => {
    if (source.negated || source.pattern.startsWith("wp-content:")) {
      return;
    }

    let logId;
    if (source.pattern.startsWith("jsdelivr:")) {
      logId = logStore.add({
        message: `Loading source: jsDelivr (${source.pattern})`,
        type: "info",
        group: "source",
      });
      contents.push(...(await jsDelivrProvider(source)));
    } else if (source.pattern.startsWith("http")) {
      logId = logStore.add({
        message: `Loading source: Network (${source.pattern})`,
        type: "info",
        group: "source",
      });
      contents.push(...(await httpFileProvider(source)));
    }

    if (logId) {
      const currentLog = logStore.logs.value.find((log) => log.id === logId);

      if (currentLog) {
        currentLog.message += " - done";
      }
    }
  });

  async function loadLocalSources() {
    const logId = logStore.add({
      message: "Loading sources: WP Content",
      type: "info",
      group: "source",
    });
    contents.push(...(await wpContentProvider(localSources, options)));
    const currentLog = logStore.logs.value.find((log) => log.id === logId);
    if (currentLog) {
      currentLog.message += " - done";
    }
  }

  if (localSources.some((source) => !source.negated)) {
    promises.push(loadLocalSources());
  }

  await Promise.all(promises);

  return contents;
}

async function jsDelivrProvider(source: Source) {
  const contents_pool: string[] = [];

  // get the path without `jsdelivr:` prefix
  const sourcePath = source.pattern.slice(String("jsdelivr:").length);

  const {
    name: packageName,
    version: packageVersion,
    path: pathPattern,
  } = parsePackageName(sourcePath);

  /**
   * Get files list from jsDelivr API and filter by path pattern
   * @see https://www.jsdelivr.com/docs/data.jsdelivr.com#get-/v1/packages/npm/-package-@-version-
   */

  const files: string[] = await fetch(
    `https://data.jsdelivr.com/v1/packages/npm/${packageName}@${packageVersion}?structure=flat`,
  )
    .then((response) => response.json())
    .then((data) => data.files)
    .then((files: { name: string }[]) => files.map((file) => file.name))
    .then((files) => files.filter((file) => minimatch(file, pathPattern)));

  const promises = files.map(async (file) => {
    const content = await fetch(
      `https://cdn.jsdelivr.net/npm/${packageName}@${packageVersion}${file}`,
    ).then((response) => response.text());

    contents_pool.push(content);
  });

  await Promise.all(promises);

  return contents_pool;
}

async function httpFileProvider(source: Source) {
  const content = await fetch(source.pattern).then((response) => response.text());

  return [content];
}

async function wpContentProvider(sources: Source[], options: LoadSourceOptions) {
  const patterns = [...new Set(sources.filter((source) => !source.negated).map((source) => source.pattern.slice("wp-content:".length)))];
  const excludePatterns = [...new Set(sources.filter((source) => source.negated).map((source) => source.pattern.slice("wp-content:".length)))];
  const contents: string[] = [];
  const cursors = new Set<string>();
  const api = useApi();
  const kind = options.kind ?? 'full';
  const key = sourceCacheKey(api.defaults?.baseURL || '', 'local', JSON.stringify({
    patterns: [...patterns].sort(),
    exclude_patterns: [...excludePatterns].sort(),
  }));
  const baseline = options.indexedCache && kind === 'incremental' ? await options.indexedCache.read(key) : null;
  options.signal?.throwIfAborted();
  const collector = options.indexedCache ? new SourceSnapshotCollector(baseline, (source) => source.content) : null;
  let cursor: string | false = false;

  function fetchScan(input: RequestInfo | URL, init?: RequestInit) {
    return (api.defaults?.fetch || fetch)(input, { ...init, signal: options.signal });
  }

  do {
    options.signal?.throwIfAborted();
    const scan: LocalScanResponse = await api
      .post("admin/local-file-provider/scan", {
        patterns,
        exclude_patterns: excludePatterns,
        batch: true,
        cursor,
        ...(collector ? {
          kind,
          source_index: { version: 1, baseline: baseline?.revision ?? null },
          ...(options.sourceRevision ? { source_revision: options.sourceRevision } : {}),
        } : {}),
      }, { fetch: fetchScan })
      .then((resp) => resp.data);
    options.signal?.throwIfAborted();

    if (!scan || (!collector && (!Array.isArray(scan.contents) || !scan.contents.every((entry: { content?: unknown }) => entry && typeof entry.content === "string")))) {
      throw new Error("The local file scanner returned invalid source contents.");
    }
    const nextCursor = scan.metadata?.next_batch;
    if (nextCursor !== false && (typeof nextCursor !== "string" || !nextCursor || cursors.has(nextCursor))) {
      throw new Error("The local file scanner returned an invalid continuation cursor.");
    }
    cursor = nextCursor;
    if (collector) {
      if (options.sourceRevision && scan.metadata?.source_revision !== options.sourceRevision) {
        throw new Error('Source data changed during the local scan. Retry the build.');
      }
      collector.applyPage(scan.contents, scan.metadata?.source_index, cursor);
    } else {
      contents.push(...(scan.contents as Array<{ content: string }>).map((entry) => entry.content));
    }
    if (cursor !== false) {
      cursors.add(cursor);
    }
  } while (cursor !== false);

  if (collector && options.indexedCache) {
    const snapshot = collector.finish();
    options.indexedCache.stage(key, snapshot);
    return snapshot.sources.map((source) => source.normalized);
  }

  return contents;
}
