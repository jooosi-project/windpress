<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/vendor/autoload.php';

use WindPress\WindPress\Api\Admin\LocalFileProvider;
use WindPress\WindPress\Core\Scanner\FileScanner;
use WindPress\WindPress\Core\Scanner\ScanLock;
use WindPress\WindPress\Core\Scanner\SourceIndex;
use WindPress\WindPress\Core\Scanner\SourceRevision;

$transients = [];
$options = [];
$user_id = 1;
$extra_roots = [];
$on_transient_read = null;
$on_option_read = null;

class WP_REST_Request
{
    private array $payload;

    public function __construct(array $payload)
    {
        $this->payload = $payload;
    }

    public function get_json_params(): array
    {
        return $this->payload;
    }
}

class WP_REST_Response
{
    public array $data;

    public int $status;

    public function __construct(array $data, int $status = 200)
    {
        $this->data = $data;
        $this->status = $status;
    }
}

class FileScanDatabase
{
    public string $options = 'wp_options';

    public function delete(string $table, array $where): void
    {
        global $options;
        $name = $where['option_name'];
        if (serialize($options[$name] ?? null) === $where['option_value']) {
            unset($options[$name]);
        }
    }
}

$wpdb = new FileScanDatabase();

function get_option(string $name, $default = false)
{
    global $options, $on_option_read;
    $value = $options[$name] ?? $default;
    if ($on_option_read !== null) {
        $callback = $on_option_read;
        $on_option_read = null;
        $callback($name);
    }
    return $value;
}

function add_option(string $name, $value, string $deprecated = '', bool $autoload = false): bool
{
    global $options;
    if (isset($options[$name])) {
        return false;
    }
    $options[$name] = $value;
    return true;
}

function wp_generate_uuid4(): string
{
    return bin2hex(random_bytes(16));
}

function update_option(string $name, $value, bool $autoload = false): bool
{
    global $options;
    $options[$name] = $value;
    return true;
}

function get_current_blog_id(): int
{
    return 1;
}

function get_locale(): string
{
    return 'en_US';
}

function wp_cache_delete(string $key, string $group): void
{
}

function maybe_serialize($value): string
{
    return serialize($value);
}

function __(string $message, string $domain): string
{
    return $message;
}

function get_current_user_id(): int
{
    global $user_id;
    return $user_id;
}

function get_transient(string $key)
{
    global $transients, $on_transient_read;
    $value = $transients[$key] ?? false;
    if ($on_transient_read !== null) {
        $callback = $on_transient_read;
        $on_transient_read = null;
        $callback($key);
    }
    return $value;
}

function set_transient(string $key, $value, int $expiration): bool
{
    global $transients;
    $transients[$key] = $value;
    return true;
}

function delete_transient(string $key): bool
{
    unset($GLOBALS['transients'][$key]);
    return true;
}

function apply_filters(string $hook, $value, ...$args)
{
    global $extra_roots;
    return $hook === 'f!windpress/core/scanner/file:allowed_roots' ? array_merge($value, $extra_roots) : $value;
}

function expect(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

function expect_error(callable $callback, string $message, ?int $code = null): void
{
    try {
        $callback();
    } catch (Throwable $throwable) {
        expect(strpos($throwable->getMessage(), $message) !== false, 'Unexpected exception: ' . $throwable->getMessage());
        if ($code !== null) {
            expect($throwable->getCode() === $code, 'Unexpected exception code: ' . $throwable->getCode());
        }
        return;
    }
    throw new RuntimeException('Expected exception containing: ' . $message);
}

function collect_files(string $root, array $patterns, array $exclusions = [], array $limits = []): array
{
    $contents = [];
    $cursor = false;
    $pages = 0;
    do {
        $result = FileScanner::scan_local($root, $patterns, $exclusions, $cursor, true, $limits);
        $contents = array_merge($contents, $result['contents']);
        $cursor = $result['metadata']['next_batch'];
        expect(++$pages < 100, 'Scanner did not finish.');
        if (isset($limits['bytes'])) {
            expect($result['metadata']['scanned_bytes'] <= $limits['bytes'], 'Byte budget exceeded.');
        }
        if (isset($limits['files'])) {
            expect(count($result['contents']) <= $limits['files'], 'File budget exceeded.');
        }
    } while ($cursor !== false);
    return $contents;
}

function indexed_files(string $root, array $patterns, ?string $baseline = null, array $exclusions = []): array
{
    $metadata = [
        'source_index' => [
            'version' => 1,
            'baseline' => $baseline,
        ],
        'kind' => 'incremental',
        'next_batch' => false,
    ];
    $contents = [];
    $examined = 0;
    $unchanged = 0;
    $pages = 0;
    do {
        $result = SourceIndex::scan('local:' . FileScanner::local_scope($root, $patterns, $exclusions), $metadata, static function (array $metadata) use ($root, $patterns, $exclusions): array {
            return FileScanner::scan_local($root, $patterns, $exclusions, $metadata['next_batch'], true, [
                'files' => 1,
                'bytes' => 5,
            ]);
        });
        $contents = array_merge($contents, $result['contents']);
        $examined += $result['metadata']['source_index']['examined'];
        $unchanged += $result['metadata']['source_index']['unchanged'];
        $metadata['next_batch'] = $result['metadata']['next_batch'];
        expect(++$pages < 100, 'Indexed file scan did not finish.');
        expect($result['metadata']['scanned_files'] <= 1, 'Unchanged sources bypassed the file budget.');
    } while ($metadata['next_batch'] !== false);

    return [
        'contents' => $contents,
        'index' => $result['metadata']['source_index'],
        'examined' => $examined,
        'unchanged' => $unchanged,
        'pages' => $pages,
    ];
}

function paths(array $contents): array
{
    $paths = array_column($contents, 'relative_path');
    sort($paths, SORT_STRING);
    return $paths;
}

function remove_fixture(string $path): void
{
    if (is_link($path) || ! is_dir($path)) {
        unlink($path);
        return;
    }
    foreach (scandir($path) as $name) {
        if ($name !== '.' && $name !== '..') {
            remove_fixture($path . '/' . $name);
        }
    }
    rmdir($path);
}

$fixture = sys_get_temp_dir() . '/windpress-file-scanner-' . bin2hex(random_bytes(8));
mkdir($fixture . '/content/themes/demo/parts', 0777, true);
mkdir($fixture . '/content/themes/demo/vendor', 0777, true);
mkdir($fixture . '/outside', 0777, true);
$root = realpath($fixture . '/content');
define('WP_CONTENT_DIR', $root);

try {
    file_put_contents($root . '/index.php', 'root');
    file_put_contents($root . '/themes/demo/index.php', 'home');
    file_put_contents($root . '/themes/demo/parts/card.php', 'card');
    file_put_contents($root . '/themes/demo/parts/card.twig', 'twig');
    file_put_contents($root . '/themes/demo/vendor/unused.php', 'skip');
    file_put_contents($fixture . '/outside/private.php', 'outside');

    $all_php = ['index.php', 'themes/demo/index.php', 'themes/demo/parts/card.php', 'themes/demo/vendor/unused.php'];
    expect(paths(collect_files($root, ['**/*.php'], [], [
        'files' => 1,
    ])) === $all_php, 'Leading ** must include root and nested files.');
    expect(paths(collect_files($root, ['themes/demo/**/*.{php,twig}'], ['**/vendor/**'])) === ['themes/demo/index.php', 'themes/demo/parts/card.php', 'themes/demo/parts/card.twig'], 'Brace patterns and recursive exclusions must work.');
    expect(paths(collect_files($root, ['themes/demo'], ['themes/demo/vendor'])) === ['themes/demo/index.php', 'themes/demo/parts/card.php', 'themes/demo/parts/card.twig'], 'Literal directories must scan recursively and exclusions must prune directories.');
    expect(paths(collect_files($root, ['**/*.php', 'themes/demo/**/*.php'])) === $all_php, 'Overlapping patterns must not duplicate files.');
    expect(paths(collect_files($root, ['themes/demo/**/*.php'], [], [
        'files' => 10,
        'bytes' => 5,
    ])) === array_slice($all_php, 1), 'Byte-limited batches must retain pending files.');

    $legacy = FileScanner::scan_local($root, ['**/*.php'], [], false, false, [
        'files' => 1,
        'bytes' => 1,
    ]);
    expect(paths($legacy['contents']) === $all_php && $legacy['metadata']['next_batch'] === false, 'Legacy requests must return all sources.');
    expect_error(static function () use ($root): void {
        collect_files($root, ['index.php'], [], [
            'bytes' => 3,
        ]);
    }, 'byte limit');
    expect_error(static function () use ($root): void { collect_files($root, ['../outside/*.php']); }, 'within');
    expect_error(static function () use ($root): void { collect_files($root, [123]); }, 'strings');
    expect_error(static function () use ($root): void { collect_files($root, ['[broken']); }, 'invalid');

    $first = FileScanner::scan_local($root, ['**/*.php'], [], false, true, [
        'files' => 1,
    ]);
    $cursor = $first['metadata']['next_batch'];
    $second = FileScanner::scan_local($root, ['**/*.php'], [], $cursor, true, [
        'files' => 1,
    ]);
    expect(FileScanner::scan_local($root, ['**/*.php'], [], $cursor, true, [
        'files' => 1,
    ]) === $second, 'Retrying the latest cursor must replay the same page.');
    expect_error(static function () use ($root, $cursor): void { FileScanner::scan_local($root, ['**/*.twig'], [], $cursor); }, 'sources changed');
    $user_id = 2;
    expect_error(static function () use ($root, $cursor): void { FileScanner::scan_local($root, ['**/*.php'], [], $cursor); }, 'expired');
    $user_id = 1;

    $first = FileScanner::scan_local($root, ['themes/demo/parts/*'], [], false, true, [
        'files' => 1,
    ]);
    unlink($root . '/themes/demo/parts/card.php');
    file_put_contents($root . '/themes/demo/parts/aaa.php', 'new');
    $next = FileScanner::scan_local($root, ['themes/demo/parts/*'], [], $first['metadata']['next_batch'], true, [
        'files' => 1,
    ]);
    expect(paths($next['contents']) === ['themes/demo/parts/card.twig'], 'Directory snapshots must not shift after additions and deletions.');
    unlink($root . '/themes/demo/parts/aaa.php');
    file_put_contents($root . '/themes/demo/parts/card.php', 'card');

    symlink($fixture . '/outside', $root . '/unrelated');
    expect(count(collect_files($root, ['themes/demo/**/*.php'])) === 3, 'Narrow roots must avoid unrelated out-of-root symlinks.');
    expect_error(static function () use ($root): void { collect_files($root, ['unrelated/**/*.php']); }, 'outside the allowed');
    expect(count(collect_files($root, ['**/*.php'], ['unrelated/**'])) === 4, 'Excluded directories must be pruned before following links.');
    $extra_roots = [$fixture . '/outside'];
    expect(paths(collect_files($root, ['unrelated/**/*.php'])) === ['unrelated/private.php'], 'Explicitly allowed development symlinks must work.');
    $extra_roots = [];
    unlink($root . '/unrelated');

    symlink($root . '/themes/demo', $root . '/alias');
    symlink($root . '/themes/demo', $root . '/themes/demo/loop');
    expect(count(collect_files($root, ['**/*.php'])) === 4, 'In-root links and cycles must not duplicate sources or loop.');
    expect(count(collect_files($root, ['alias/**/*.php', 'themes/demo/**/*.twig'])) === 4, 'Different patterns for aliases must retain all matching files.');
    unlink($root . '/alias');
    unlink($root . '/themes/demo/loop');

    $factory_calls = 0;
    $factory = static function () use ($root, &$factory_calls): array {
        $factory_calls++;
        return [
            [
                'path' => $root . '/index.php',
                'name' => 'index.php',
            ],
            [
                'path' => $root . '/index.php',
                'name' => 'duplicate',
            ],
            [
                'path' => $root . '/themes/demo/index.php',
                'name' => 'theme.php',
                'type' => 'json',
            ],
        ];
    };
    $manifest = FileScanner::scan_files('fixture', $factory, false, [
        'files' => 1,
    ]);
    $manifest_next = FileScanner::scan_files('fixture', $factory, $manifest['metadata']['next_batch'], [
        'files' => 1,
    ]);
    expect($factory_calls === 1, 'Provider manifests must not be rebuilt between pages.');
    expect($manifest_next['contents'][0]['name'] === 'theme.php' && $manifest_next['contents'][0]['type'] === 'json', 'Provider snapshots must deduplicate and preserve metadata.');

    $first = FileScanner::scan_local($root, ['**/*.php'], [], false, true, [
        'files' => 1,
    ]);
    $cursor = $first['metadata']['next_batch'];
    $concurrent_attempts = 0;
    $on_transient_read = static function (string $key) use ($root, $cursor, &$concurrent_attempts): void {
        $concurrent_attempts++;
        expect_error(static function () use ($root, $cursor): void {
            FileScanner::scan_local($root, ['**/*.php'], [], $cursor, true, [
                'files' => 2,
            ]);
        }, 'already processing', 409);
    };
    $second = FileScanner::scan_local($root, ['**/*.php'], [], $cursor, true, [
        'files' => 1,
    ]);
    expect($concurrent_attempts === 1, 'Concurrent cursor fixture did not interleave requests.');
    expect(paths($second['contents']) === ['themes/demo/index.php'], 'Concurrent request changed the next scan position.');
    expect(FileScanner::scan_local($root, ['**/*.php'], [], $cursor, true, [
        'files' => 1,
    ]) === $second, 'Lease was not released after advancing a cursor.');
    $remaining = FileScanner::scan_local($root, ['**/*.php'], [], $second['metadata']['next_batch']);
    expect(paths(array_merge($first['contents'], $second['contents'], $remaining['contents'])) === $all_php, 'Concurrent requests skipped source files.');
    expect($options === [], 'Completed scans leaked a lease.');

    $first = FileScanner::scan_local($root, ['**/*.php'], [], false, true, [
        'files' => 1,
    ]);
    $cursor = $first['metadata']['next_batch'];
    $resource = 'windpress_scan_1_' . explode('_', $cursor)[1];
    $lease = ScanLock::acquire($resource);
    $conflict = (new LocalFileProvider())->scan(new WP_REST_Request([
        'patterns' => ['**/*.php'],
        'cursor' => $cursor,
        'batch' => true,
    ]));
    expect($conflict->status === 409, 'The local scan endpoint must surface lease conflicts as HTTP 409.');
    ScanLock::release($resource, $lease);

    $lease = ScanLock::acquire('expired-fixture');
    $lock_option = array_key_first($options);
    expect(is_string($lease) && ScanLock::acquire('expired-fixture') === null, 'Only one owner may acquire a scan lease.');
    ScanLock::release('expired-fixture', 'wrong-owner');
    expect(ScanLock::is_owner('expired-fixture', $lease), 'A different owner released a lease.');
    $options[$lock_option]['expires'] = time() - 1;
    $replacement = ScanLock::acquire('expired-fixture');
    expect(is_string($replacement) && $replacement !== $lease, 'An expired lease must be recoverable.');
    ScanLock::release('expired-fixture', $lease);
    expect(ScanLock::is_owner('expired-fixture', $replacement), 'The expired owner removed its replacement.');
    ScanLock::release('expired-fixture', $replacement);

    $lease = ScanLock::acquire('expiry-race-fixture');
    $lock_option = array_key_first($options);
    $options[$lock_option]['expires'] = time() - 1;
    $on_option_read = static function (string $name) use (&$options): void {
        $options[$name] = [
            'token' => 'replacement-owner',
            'expires' => time() + 300,
        ];
    };
    expect(ScanLock::acquire('expiry-race-fixture') === null, 'Expired-lease deletion must not remove a concurrent replacement.');
    expect(ScanLock::is_owner('expiry-race-fixture', 'replacement-owner'), 'Concurrent replacement lease disappeared.');
    ScanLock::release('expiry-race-fixture', 'replacement-owner');

    $first = FileScanner::scan_local($root, ['**/*.php'], [], false, true, [
        'files' => 1,
    ]);
    $cursor = $first['metadata']['next_batch'];
    $snapshot = $transients;
    $replacement = null;
    $resource = '';
    $on_transient_read = static function (string $key) use (&$options, &$replacement, &$resource): void {
        $resource = $key;
        $option = array_key_first($options);
        $options[$option]['expires'] = time() - 1;
        $replacement = ScanLock::acquire($key);
        expect(is_string($replacement), 'The expired scan lease was not replaced.');
    };
    expect_error(static function () use ($root, $cursor): void {
        FileScanner::scan_local($root, ['**/*.php'], [], $cursor, true, [
            'files' => 1,
        ]);
    }, 'lease expired', 409);
    expect($transients === $snapshot, 'An expired request overwrote continuation state.');
    expect(ScanLock::is_owner($resource, $replacement), 'Expired request released a replacement lease.');
    ScanLock::release($resource, $replacement);
    expect(paths(FileScanner::scan_local($root, ['**/*.php'], [], $cursor)['contents']) === array_slice($all_php, 1), 'Expired request consumed source files.');

    $first = FileScanner::scan_local($root, ['**/*.php'], [], false, true, [
        'files' => 1,
    ]);
    $transients = [];
    expect_error(static function () use ($root, $first): void { FileScanner::scan_local($root, ['**/*.php'], [], $first['metadata']['next_batch']); }, 'expired');

    $cold = indexed_files($root, ['**/*.php']);
    expect(count($cold['contents']) === 4 && $cold['index']['mode'] === 'snapshot', 'A cold file index must include all files.');
    $ids = array_column($cold['contents'], 'source_id', 'relative_path');
    expect(count(array_unique($ids)) === 4, 'Files must have distinct stable source IDs.');
    $warm = indexed_files($root, ['**/*.php'], $cold['index']['revision']);
    expect($warm['contents'] === [] && $warm['unchanged'] === 4 && $warm['examined'] === 4, 'Unchanged files must not be retransmitted.');
    expect($warm['pages'] >= 4, 'Unchanged file reads must still obey the per-page budget.');

    $mtime = filemtime($root . '/index.php');
    file_put_contents($root . '/index.php', 'ROOT');
    touch($root . '/index.php', $mtime);
    $edited = indexed_files($root, ['**/*.php'], $warm['index']['revision']);
    expect(count($edited['contents']) === 1 && $edited['contents'][0]['content'] === 'ROOT', 'Same-size and same-mtime edits must invalidate file contents.');
    expect($edited['contents'][0]['source_id'] === $ids['index.php'], 'Editing a file must preserve its source ID.');

    unlink($root . '/themes/demo/vendor/unused.php');
    rename($root . '/themes/demo/parts/card.php', $root . '/themes/demo/parts/renamed.php');
    $renamed = indexed_files($root, ['**/*.php'], $edited['index']['revision']);
    expect(count($renamed['contents']) === 1 && $renamed['contents'][0]['relative_path'] === 'themes/demo/parts/renamed.php', 'Renamed files must be added with a new source ID.');
    $deleted = $renamed['index']['deleted'];
    sort($deleted);
    $expected_deleted = [$ids['themes/demo/vendor/unused.php'], $ids['themes/demo/parts/card.php']];
    sort($expected_deleted);
    expect($deleted === $expected_deleted, 'Deleted files and previous names must be removed from the index.');

    $excluded = indexed_files($root, ['**/*.php'], $renamed['index']['revision'], ['themes/demo/parts/**']);
    expect($excluded['index']['mode'] === 'snapshot' && count($excluded['contents']) === 2, 'Changed exclusions must reset the local source scope.');
    $extra_roots = [$fixture . '/outside'];
    $changed_roots = indexed_files($root, ['**/*.php'], $excluded['index']['revision'], ['themes/demo/parts/**']);
    expect($changed_roots['index']['mode'] === 'snapshot', 'Changed allowed roots must reset the source scope.');
    $extra_roots = [];

    foreach (array_keys($transients) as $key) {
        if (strpos($key, 'windpress_source_manifest_') === 0) {
            unset($transients[$key]);
        }
    }
    $expired = indexed_files($root, ['**/*.php'], $renamed['index']['revision']);
    expect($expired['index']['mode'] === 'snapshot' && count($expired['contents']) === 3, 'Expired file manifests must fall back to a complete snapshot.');
    rename($root . '/themes/demo/parts/renamed.php', $root . '/themes/demo/parts/card.php');
    file_put_contents($root . '/themes/demo/vendor/unused.php', 'skip');
    file_put_contents($root . '/index.php', 'root');

    symlink($root . '/index.php', $root . '/selected.php');
    $linked = indexed_files($root, ['selected.php']);
    unlink($root . '/selected.php');
    symlink($root . '/themes/demo/index.php', $root . '/selected.php');
    $retargeted = indexed_files($root, ['selected.php'], $linked['index']['revision']);
    expect(count($retargeted['contents']) === 1 && $retargeted['contents'][0]['content'] === 'home', 'Retargeted symlinks must expose their new source.');
    expect($retargeted['index']['deleted'] === [$linked['contents'][0]['source_id']], 'Retargeted symlinks must delete their previous source identity.');
    unlink($root . '/selected.php');

    $scope = 'local:' . FileScanner::local_scope($root, ['themes/demo/parts/*']);
    $metadata = [
        'source_index' => [
            'version' => 1,
            'baseline' => null,
        ],
        'kind' => 'incremental',
        'next_batch' => false,
    ];
    $fetch = static function (array $metadata) use ($root): array {
        return FileScanner::scan_local($root, ['themes/demo/parts/*'], [], $metadata['next_batch'], true, [
            'files' => 1,
        ]);
    };
    $partial = SourceIndex::scan($scope, $metadata, $fetch);
    $metadata['next_batch'] = $partial['metadata']['next_batch'];
    $before_failure = array_filter($transients, static fn ($key): bool => strpos($key, 'windpress_source_manifest_') === 0, ARRAY_FILTER_USE_KEY);
    unlink($root . '/themes/demo/parts/card.twig');
    expect_error(static function () use ($scope, $metadata, $fetch): void { SourceIndex::scan($scope, $metadata, $fetch); }, 'no longer exists');
    $after_failure = array_filter($transients, static fn ($key): bool => strpos($key, 'windpress_source_manifest_') === 0, ARRAY_FILTER_USE_KEY);
    expect($before_failure === $after_failure, 'A failed file page must not publish an incomplete manifest.');
    file_put_contents($root . '/themes/demo/parts/card.twig', 'twig');

    $source_revision = SourceRevision::get();
    $request = [
        'patterns' => ['**/*.php'],
        'batch' => true,
        'source_index' => [
            'version' => 1,
            'baseline' => null,
        ],
        'kind' => 'incremental',
        'source_revision' => $source_revision,
    ];
    $response = (new LocalFileProvider())->scan(new WP_REST_Request($request));
    expect($response->status === 200 && count($response->data['contents']) === 4, 'The local endpoint must accept indexed file requests.');
    expect($response->data['metadata']['source_revision'] === $source_revision, 'The endpoint must return the captured source revision.');
    $request['source_index']['baseline'] = $response->data['metadata']['source_index']['revision'];
    $response = (new LocalFileProvider())->scan(new WP_REST_Request($request));
    expect($response->status === 200 && $response->data['contents'] === [], 'The local endpoint must serve warm deltas.');
    SourceRevision::invalidate();
    expect((new LocalFileProvider())->scan(new WP_REST_Request($request))->status === 409, 'A stale source revision must fail the local scan.');

    echo "File scanner checks passed.\n";
} finally {
    remove_fixture($fixture);
}
