# Backend scanning

PHP providers collect source text. The browser extracts Tailwind candidates and
compiles CSS. Shared PHP helpers live in `src/Core/Scanner/`.

## Database providers

`PostQuery` orders records by ID and returns an opaque `metadata.next_batch`
cursor. Pass that value unchanged to the next request; `false` ends the scan.
The initial maximum ID excludes records created after the scan starts. Removing
earlier records does not shift subsequent batches. This is an ID boundary, not a
transactional snapshot of post contents or eligibility; concurrent edits can
still change the source data read during a build.

The default batch size is 50, bounded to 1–200. It is independent of WordPress's
front-page `posts_per_page` setting. Existing provider `post_per_page` filters
still apply within these bounds; zero and negative values use the scan default.
The shared default can be customized with
`f!windpress/core/scanner:batch_size`.

Older callers may still send numeric pages. Newly returned cursors avoid offset
pagination. Custom providers may continue to return their existing cursors.
Queries carry `windpress_scan => true`; query customizations can inspect this
flag to avoid changing the scanner's ordering or pagination. Incompatible query
filters fail explicitly rather than silently omitting records.

`PostRenderer` establishes the source post's WordPress context and restores the
previous post-template globals in `finally`. It includes raw content alongside
rendered output to retain classes in conditional branches. Renderer failures
identify the provider and post and abort the build. Existing provider render
filters can disable rendering while retaining raw sources.

## Local files

The local scan endpoint accepts:

```json
{
  "patterns": ["themes/example/**/*.php", "themes/example/**/*.twig"],
  "exclude_patterns": ["themes/example/vendor/**"],
  "batch": true,
  "cursor": false
}
```

Patterns are relative to `wp-content`. Leading `**` includes root and nested
files. Compatible roots are combined, exclusions prune traversal, and real paths
are deduplicated. Response metadata includes `next_batch`, `scanned_files`, and
`scanned_bytes`. Send the returned cursor with the same patterns until it is
`false`. Legacy `{ "path": "..." }` requests remain unbatched.

Default budgets are 100 files, 2 MiB of content, and one second per batch.
`f!windpress/core/scanner/file:limits` receives the `files`, `bytes`, and `seconds`
budget array plus the scan scope. A single file exceeding the byte budget fails
explicitly; narrow the source pattern or increase the configured budget.

Continuation state expires after 15 minutes and belongs to the current user.
The most recent continuation page can be retried. Overlapping requests for the
same job return HTTP 409; retry the same cursor once the pending request ends.
Directory entries are saved
as traversal progresses. Timber and Blockstudio enumerate their path manifests
once, then batch content reads; that initial path enumeration is synchronous.

Symlinks within the allowed roots work, including cycle detection. The default
allowed root is `wp-content`; explicitly allow external development directories
through `f!windpress/core/scanner/file:allowed_roots`, which receives the allowed
root array and source root. Existing hidden-file/VCS exclusions remain in place.

## Cache generations

The cache index and provider responses include a persistent `generation`.
Clients send it as `metadata.generation` on provider requests and
`expected_generation` when storing CSS. An outdated generation returns HTTP 409
and requires restarting the build. Publication uses a short server lease to
prevent simultaneous saves. A successful full build rotates the generation and
records a server timestamp in WordPress options, without requiring Redis or
another persistent object cache.

The index also returns `source_revision`. Send it as `metadata.source_revision`
on provider scans, `source_revision` on local file scans, and
`expected_source_revision` when storing CSS. Post, metadata, term, user, durable
option, theme, and plugin changes rotate this token. A mismatch before/after a
scan or before publication returns HTTP 409, without publishing the stale CSS.
Scan bookkeeping, transients, cron, and rewrite caches do not rotate it.
Editor heartbeat's `_edit_lock` metadata is also excluded. The
`f!windpress/core/scanner/source_revision:track_post_meta` filter receives a
boolean, metadata key, and post ID for other non-content bookkeeping exclusions.
`f!windpress/core/scanner/source_revision:track_option` receives a boolean and
option name; use it only to exclude options that cannot affect source content.

This mutation guard covers changes made through the registered WordPress hooks.
Direct SQL writes, network settings, external filesystem edits, time, and remote
dependencies are not a transactional snapshot. These are reevaluated on the next
scan; applications requiring atomic publication across them need their own
coordination.

## Per-source change indexing

Built-in providers advertise `source_index: 1`. Indexed scans include:

```json
{
  "provider_id": "gutenberg",
  "metadata": {
    "next_batch": false,
    "kind": "incremental",
    "source_index": { "version": 1, "baseline": null }
  }
}
```

Include the generation and source revision described above. Once a successful
build has a cached snapshot, replace `baseline` with its manifest revision.
Local file requests accept the same `kind` and `source_index` at the top level,
alongside `patterns`, exclusions, `batch: true`, and `cursor`.

Each source has a stable provider-local `source_id`; Bricks uses separate IDs
for its content/header/footer fragments and shared components. Files use their
canonical path identity. `SourceIndex` hashes the final content and type and
returns only new or changed bodies, each with its `source_hash`. Provider bodies
remain base64 encoded; local file bodies remain plain text.

`metadata.source_index` contains:

- `version: 1`, `mode: "snapshot" | "delta"`, and an opaque `scope`.
- `base_revision`: the accepted baseline, or `null` for snapshots.
- `revision`: `null` during pagination, then the completed manifest revision.
- `deleted`: source IDs removed from the baseline, emitted only on completion.
- `examined`, `changed`, and `unchanged`: counts for the current page.

Continue passing the original request and returned opaque `next_batch` until it
is `false`. Do not interpret indexed cursors as underlying provider cursors.
The latest continuation response can be replayed, concurrent use returns 409,
and a duplicate source ID aborts the scan. Deletions are never inferred from a
partial or failed scan. A missing/expired baseline, changed scope, or full build
produces a complete snapshot; the browser replaces its baseline rather than
merging the reset into old data.

Server manifests contain only identities and hashes, expire after seven days,
and are scoped to the site, user, locale, plugin version, and provider/source
configuration. Jobs expire after 15 minutes. They use WordPress transients and
work without Redis or a new database table. Each scope retains at most eight
manifest revisions, each at most 2 MiB serialized. Oversized manifests can finish
the build but are not retained; their next build uses a snapshot. Evicted
baselines also fall back to snapshots. Active job membership maps still grow
with the number of sources, rather than just the page size.
Manifests are immutable: finishing
a scan does not advance another build's baseline. The optional
`f!windpress/core/scanner/source_index:scope` filter receives an extra scope
value (default empty string) and the provider/file scope; change that value when
custom extraction semantics need a fresh namespace.

Browser v2 snapshots cache normalized source bodies by identity and hash.
Unchanged records avoid transfer, base64 decoding, JSON parsing, YAML conversion,
and entity normalization. Every enabled provider is checked on incremental
builds, including providers absent from local editor hints, so other editors'
changes are observed. Candidate extraction and final CSS compilation still run
over the complete reconciled source set. Previous v1 caches rebuild automatically.

Provider and local-file snapshots are scoped to the REST base URL and generation
and written in one IndexedDB transaction only after successful CSS publication.
Failed builds and previews do not replace them. Provider requests have a
concurrency limit of two; failures cancel in-flight work and stop queued providers.

Providers declare `source_index: 1` in their registration; the cache layer does
not infer this capability from integration names or callback classes.
Custom providers without the capability keep the legacy response contract and
are fully fetched each build. To opt in, register `source_index: 1` and emit a
unique, stable string `source_id` for every content record. Keep IDs independent
of titles, pagination position, and content hashes. Records omitted from a
completed scan are treated as deleted.
When replacing an indexed provider's callback with one that does not honor this
contract, remove the capability or set `source_index: 0` in the same filter.

## Extraction costs and shared dependencies

Membership is still enumerated on every scan. Source content is read and hashed,
including actual file bytes: timestamps and sizes alone cannot detect all edits.
File batch budgets count every examined file, including unchanged files.

`ExtractionCache` reuses deterministic transforms in stable per-user/site/version
transient slots for seven days, with a 2 MiB entry limit. Bricks fingerprints raw
metadata and the current global-class map; changes to shared classes or component
definitions invalidate dependent transforms. Gutenberg's parsed block dump is
cached by raw content and WordPress version unless a custom parser is installed.
Oxygen Classic reuses stored JSON conversion and eligible legacy conversion only
when decoder hooks/signature state permit deterministic reuse. Failed transforms
are never cached.

Dynamic blocks, shortcodes, templates, and provider content filters still run
fresh. Their output can depend on other posts, options, time, or external data;
unchanged post timestamps cannot establish that rendered output is unchanged.
This stage saves deterministic extraction and transport work without assuming
an incomplete dependency graph.

## Regression checks

Run `composer test:scan` for isolated PHP/WordPress fixtures and `pnpm test:scan`
for source loading, Unicode extraction, concurrency, and cache publication
tests. The Unicode regression executes the local Oxide WASM. Run `pnpm test`
after regenerating WASM, and `pnpm build` for the production bundle.
