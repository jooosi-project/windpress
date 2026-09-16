import { compressToUTF16, decompressFromUTF16 } from '@windpress/lz-string';

export interface ProviderContent {
  content: string;
  type?: string | null;
}

export interface ProviderCacheResult {
  success: boolean;
  snapshot: SourceSnapshot | null;
  message?: string;
}

export interface CachedSource {
  source_id: string;
  source_hash: string;
  normalized: string;
}

export interface SourceSnapshot {
  scope: string;
  revision: string;
  sources: CachedSource[];
}

export interface SourceCacheSession {
  read(key: string): Promise<SourceSnapshot | null>;
  stage(key: string, snapshot: SourceSnapshot): void;
}

interface IndexedProviderContent extends ProviderContent {
  source_id: string;
  source_hash: string;
}

interface SourceIndexPage {
  version: 1;
  mode: 'snapshot' | 'delta';
  scope: string;
  base_revision: string | null;
  revision: string | null;
  deleted: string[];
  examined: number;
  changed: number;
  unchanged: number;
}

export type ScanCursor = string | number | false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isSourceId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 2048;
}

function isSourceSnapshot(value: unknown): value is SourceSnapshot {
  if (!isRecord(value) || typeof value.scope !== 'string' || !value.scope || !isHash(value.revision) || !Array.isArray(value.sources)) {
    return false;
  }

  const ids = new Set<string>();
  return value.sources.every((source) => {
    if (!isRecord(source) || !isSourceId(source.source_id) || !isHash(source.source_hash)
      || typeof source.normalized !== 'string' || ids.has(source.source_id)) {
      return false;
    }
    ids.add(source.source_id);
    return true;
  });
}

export function decodeProviderContent(content: string): string {
  const bytes = Uint8Array.from(atob(content), (character) => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function providerCacheKey(baseUrl: string, providerId: string): string {
  return sourceCacheKey(baseUrl, 'provider', providerId);
}

export function sourceCacheKey(baseUrl: string, namespace: string, identity: string): string {
  return `windpress.cache.sources.${JSON.stringify([baseUrl.replace(/\/+$/, ''), namespace, identity])}`;
}

export function isProviderContents(contents: unknown): contents is ProviderContent[] {
  return Array.isArray(contents) && contents.every((entry) => (
    entry !== null
    && typeof entry === 'object'
    && typeof entry.content === 'string'
    && (entry.type === undefined || entry.type === null || typeof entry.type === 'string')
  ));
}

export function encodeProviderCache(snapshot: SourceSnapshot, generation: string): string {
  return compressToUTF16(JSON.stringify({ version: 2, generation, snapshot }));
}

export function readProviderCache(value: unknown, generation: string): ProviderCacheResult {
  try {
    const decoded = typeof value === 'string' ? decompressFromUTF16(value) : null;
    const cache = decoded ? JSON.parse(decoded) : null;

    if (
      !generation
      || cache?.version !== 2
      || cache.generation !== generation
      || !isSourceSnapshot(cache.snapshot)
    ) {
      return { success: false, snapshot: null, message: 'Cached sources are outdated or invalid.' };
    }

    return { success: true, snapshot: cache.snapshot };
  } catch {
    return { success: false, snapshot: null, message: 'Cached sources could not be decoded.' };
  }
}

function readSourceIndexPage(value: unknown, terminal: boolean): SourceIndexPage {
  if (!isRecord(value) || value.version !== 1 || (value.mode !== 'snapshot' && value.mode !== 'delta')
    || typeof value.scope !== 'string' || !value.scope
    || (value.base_revision !== null && !isHash(value.base_revision))
    || (terminal ? !isHash(value.revision) : value.revision !== null)
    || !Array.isArray(value.deleted) || !value.deleted.every(isSourceId)
    || new Set(value.deleted).size !== value.deleted.length
    || (!terminal && value.deleted.length > 0)
    || !['examined', 'changed', 'unchanged'].every((key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0)
    || value.examined !== Number(value.changed) + Number(value.unchanged)
  ) {
    throw new Error('The scanner returned invalid source index metadata.');
  }
  return value as unknown as SourceIndexPage;
}

export class SourceSnapshotCollector {
  private baseline: SourceSnapshot | null;

  private normalize: (content: ProviderContent) => string;

  private sources = new Map<string, CachedSource>();

  private changedIds = new Set<string>();

  private page: SourceIndexPage | null = null;

  private examined = 0;

  private complete = false;

  constructor(baseline: SourceSnapshot | null, normalize: (content: ProviderContent) => string) {
    this.baseline = baseline;
    this.normalize = normalize;
  }

  applyPage(contents: unknown, sourceIndex: unknown, nextCursor: ScanCursor): void {
    if (this.complete) {
      throw new Error('The source scan has already completed.');
    }

    const terminal = nextCursor === false;
    const page = readSourceIndexPage(sourceIndex, terminal);
    if (!isProviderContents(contents) || !contents.every((source) => (
      'source_id' in source && isSourceId(source.source_id)
      && 'source_hash' in source && isHash(source.source_hash)
    )) || page.changed !== contents.length) {
      throw new Error('The scanner returned invalid indexed source contents.');
    }

    if (this.page !== null) {
      if (page.scope !== this.page.scope || page.mode !== this.page.mode || page.base_revision !== this.page.base_revision) {
        throw new Error('The source index context changed during scanning.');
      }
    } else if (page.mode === 'delta') {
      if (this.baseline === null || page.scope !== this.baseline.scope || page.base_revision !== this.baseline.revision) {
        throw new Error('The source delta does not match the cached baseline.');
      }
      this.sources = new Map(this.baseline.sources.map((source) => [source.source_id, source]));
    }

    if (page.mode === 'snapshot' && (page.base_revision !== null || page.deleted.length > 0)) {
      throw new Error('A source snapshot cannot contain baseline revisions or deletions.');
    }

    for (const source of contents as IndexedProviderContent[]) {
      if (this.changedIds.has(source.source_id)) {
        throw new Error('The scanner returned a duplicate source ID.');
      }
      this.changedIds.add(source.source_id);
      this.sources.set(source.source_id, {
        source_id: source.source_id,
        source_hash: source.source_hash,
        normalized: this.normalize(source),
      });
    }

    this.examined += page.examined;
    if (terminal) {
      for (const id of page.deleted) {
        if (!this.sources.has(id) || this.changedIds.has(id)) {
          throw new Error('The scanner returned conflicting source deletions.');
        }
        this.sources.delete(id);
      }
      if (this.sources.size !== this.examined) {
        throw new Error('The source snapshot is incomplete. Rebuild the full cache.');
      }
    }

    this.page = page;
    this.complete = terminal;
  }

  finish(): SourceSnapshot {
    if (!this.complete || this.page === null || this.page.revision === null) {
      throw new Error('The source scan has not completed.');
    }

    return {
      scope: this.page.scope,
      revision: this.page.revision,
      sources: Array.from(this.sources.values()),
    };
  }
}

export function readScanCursor(value: unknown): ScanCursor {
  if (value === undefined || value === null || value === false) {
    return false;
  }

  if (
    (typeof value === 'string' && value.length > 0)
    || (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }

  throw new Error('The scanner returned an invalid continuation cursor.');
}

export async function mapConcurrent<T, R>(
  values: readonly T[],
  callback: (value: T, signal: AbortSignal) => Promise<R>,
  concurrency = 2,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Scan concurrency must be a positive integer.');
  }

  const controller = new AbortController();
  const results: R[] = [];
  let next = 0;

  async function runWorker() {
    while (!controller.signal.aborted && next < values.length) {
      const index = next++;

      try {
        results[index] = await callback(values[index], controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) {
          controller.abort(error);
        }
        throw error;
      }
    }
  }

  // Settle aborted requests before allowing another build to start.
  await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker()),
  );

  if (controller.signal.aborted) {
    throw controller.signal.reason;
  }

  return results;
}
