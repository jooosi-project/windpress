<?php

declare(strict_types=1);

use WindPress\WindPress\Core\Scanner\SourceIndex;
use WindPress\WindPress\Core\Scanner\SourceRevision;

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
function __(string $message, string $domain): string { return $message; }
function wp_generate_uuid4(): string { return bin2hex(random_bytes(16)); }
function wp_json_encode($value) { return json_encode($value); }
function get_current_user_id(): int { return $GLOBALS['user'] ?? 1; }
function get_current_blog_id(): int { return 1; }
function get_locale(): string { return 'en_US'; }
function apply_filters(string $hook, $value, ...$args) { return $value; }
function get_option(string $name, $default = false) { return $GLOBALS['options'][$name] ?? $default; }
function add_option(string $name, $value, string $deprecated = '', bool $autoload = false): bool
{
    if (isset($GLOBALS['options'][$name])) { return false; }
    $GLOBALS['options'][$name] = $value;
    do_action('added_option', $name);
    return true;
}
function update_option(string $name, $value, bool $autoload = false): bool
{
    $GLOBALS['options'][$name] = $value;
    do_action('updated_option', $name);
    return true;
}
function get_transient(string $key) { return $GLOBALS['transients'][$key] ?? false; }
function delete_transient(string $key): bool { unset($GLOBALS['transients'][$key]); return true; }
function set_transient(string $key, $value, int $ttl): bool
{
    if ($GLOBALS['fail_write'] ?? false) { return false; }
    $GLOBALS['transients'][$key] = $value;
    do_action('updated_option', '_transient_' . $key);
    return true;
}
function wp_cache_delete(string $key, string $group): void {}
function maybe_serialize($value): string { return serialize($value); }
function add_action(string $hook, callable $callback, int $priority = 10, int $arguments = 1): void { $GLOBALS['hooks'][$hook][] = [$callback, $arguments]; }
function do_action(string $hook, ...$arguments): void
{
    foreach ($GLOBALS['hooks'][$hook] ?? [] as [$callback, $count]) { $callback(...array_slice($arguments, 0, $count)); }
}
$GLOBALS['wpdb'] = new class {
    public string $options = 'wp_options';
    public function delete(string $table, array $where): void
    {
        if (serialize($GLOBALS['options'][$where['option_name']] ?? null) === $where['option_value']) {
            unset($GLOBALS['options'][$where['option_name']]);
        }
    }
};
function source(string $id, string $content): array { return ['source_id' => $id, 'content' => $content]; }
function scan(array $pages, ?string $baseline = null, array $extra = [], string $scope = 'fixture'): array
{
    $request = array_replace(['source_index' => ['version' => 1, 'baseline' => $baseline], 'kind' => 'incremental', 'next_batch' => false], $extra);
    $results = [];
    do {
        $response = SourceIndex::scan($scope, $request, static function (array $metadata) use ($pages): array {
            $page = $metadata['next_batch'] === false ? 0 : $metadata['next_batch'];
            return ['contents' => $pages[$page], 'metadata' => ['next_batch' => isset($pages[$page + 1]) ? $page + 1 : false]];
        });
        $results[] = $response;
        $request['next_batch'] = $response['metadata']['next_batch'];
    } while ($request['next_batch'] !== false);
    return $results;
}
function fails(callable $callback, string $message, int $code = 0): void
{
    try { $callback(); } catch (Throwable $error) {
        check($code === 0 || $error->getCode() === $code, $message . ': wrong error code');
        return;
    }
    throw new RuntimeException($message);
}

SourceRevision::register_hooks();
$epoch = SourceRevision::get();
$cold = scan([[source('post:1', 'text-red-500')], [source('post:2', 'font-bold')]]);
$first = $cold[0]['metadata']['source_index'];
$last = $cold[1]['metadata']['source_index'];
check($first['mode'] === 'snapshot' && $first['revision'] === null && $first['deleted'] === [], 'Partial scan advertised completion.');
check(is_string($last['revision']) && count($cold[0]['contents']) === 1 && count($cold[1]['contents']) === 1, 'Cold scan did not return full source bodies.');
check(SourceRevision::matches($epoch), 'Index checkpoints or leases invalidated the build.');
$baseline = $last['revision'];
$warm = scan([[source('post:1', 'text-red-500')], [source('post:2', 'font-bold')]], $baseline);
check($warm[0]['contents'] === [] && $warm[1]['contents'] === [] && $warm[1]['metadata']['source_index']['revision'] === $baseline, 'Warm scan retransmitted unchanged bodies or changed revision.');
check($warm[0]['metadata']['source_index']['unchanged'] === 1, 'Warm scan lost examination accounting.');
$changed = scan([[source('post:1', 'text-blue-500')], [source('post:3', '')]], $baseline);
check($changed[0]['metadata']['source_index']['deleted'] === [], 'Deletion emitted before complete membership.');
check($changed[1]['metadata']['source_index']['deleted'] === ['post:2'], 'Deleted source retained.');
check($changed[1]['contents'][0]['content'] === '', 'Valid empty source was dropped.');
$empty = scan([[]], $baseline);
check($empty[0]['metadata']['source_index']['deleted'] === ['post:1', 'post:2'], 'Empty provider did not remove all former sources.');
$reset = scan([[source('post:1', 'text-red-500')]], str_repeat('0', 64));
check($reset[0]['metadata']['source_index']['mode'] === 'snapshot' && $reset[0]['metadata']['source_index']['base_revision'] === null, 'Expired baseline did not reset.');
$full = scan([[source('post:1', 'text-red-500')]], $baseline, ['kind' => 'full']);
check($full[0]['metadata']['source_index']['mode'] === 'snapshot' && count($full[0]['contents']) === 1, 'Full build reused baseline.');
$other = scan([[source('post:1', 'text-red-500')]], $baseline, [], 'other-patterns');
check($other[0]['metadata']['source_index']['mode'] === 'snapshot', 'Changed scope reused a manifest.');
$GLOBALS['user'] = 2;
$other = scan([[source('post:1', 'text-red-500')]], $baseline);
check($other[0]['metadata']['source_index']['mode'] === 'snapshot', 'Other user reused a manifest.');
$GLOBALS['user'] = 1;

$retained = [];
for ($version = 0; $version < 10; $version++) {
    $snapshot = scan([[source('bounded', (string) $version)]], null, [], 'retention');
    $retained[] = $snapshot[0]['metadata']['source_index']['revision'];
}
$evicted = scan([[source('bounded', '9')]], $retained[0], [], 'retention');
check($evicted[0]['metadata']['source_index']['mode'] === 'snapshot', 'Old manifest history was not bounded.');
$retained_warm = scan([[source('bounded', '9')]], $retained[9], [], 'retention');
check($retained_warm[0]['contents'] === [], 'Newest retained manifest could not be reused.');
$large_sources = [];
for ($id = 0; $id < 2100; $id++) { $large_sources[] = source(str_repeat('x', 1000) . $id, 'text-blue-500'); }
$oversized = scan([$large_sources], null, [], 'oversized')[0];
$oversized_retry = scan([$large_sources], $oversized['metadata']['source_index']['revision'], [], 'oversized')[0];
check($oversized_retry['metadata']['source_index']['mode'] === 'snapshot' && count($oversized_retry['contents']) === count($large_sources), 'Oversized manifest did not safely fall back to a full snapshot.');
unset($large_sources, $oversized, $oversized_retry);

$metadata = ['source_index' => ['version' => 1, 'baseline' => null], 'generation' => 'generation-1'];
$start = SourceIndex::scan('retry', $metadata, static fn (): array => ['contents' => [source('a', 'a')], 'metadata' => ['next_batch' => 'page-2']]);
$metadata['next_batch'] = $start['metadata']['next_batch'];
$terminal = SourceIndex::scan('retry', $metadata, static fn (): array => ['contents' => [source('b', 'b')], 'metadata' => ['next_batch' => false]]);
$replay = SourceIndex::scan('retry', $metadata, static function (): array { throw new RuntimeException('Replay called the provider'); });
check($terminal === $replay, 'Latest page replay was not idempotent.');
$metadata['generation'] = 'generation-2';
fails(static fn () => SourceIndex::scan('retry', $metadata, static fn (): array => []), 'Changed generation accepted cursor.', 409);
fails(static fn () => scan([[source('a', 'a')], [source('a', 'changed')]]), 'Duplicate identity was accepted.');
fails(static fn () => scan([[['content' => 'missing-id']]]), 'Missing identity was accepted.');
fails(static fn () => scan([[]], null, ['source_index' => ['version' => 2, 'baseline' => null]]), 'Unknown protocol was accepted.');
$GLOBALS['fail_write'] = true;
fails(static fn () => scan([[source('failure', 'never-store')]]), 'Storage failure was ignored.');
$GLOBALS['fail_write'] = false;

$epoch = SourceRevision::get();
do_action('updated_post_meta', 1, 42, '_edit_lock');
check(SourceRevision::matches($epoch), 'Editor heartbeat invalidated build without a source edit.');
do_action('updated_post_meta', 2, 42, '_bricks_page_content_2');
check(! SourceRevision::matches($epoch), 'Post metadata change did not invalidate build.');
$epoch = SourceRevision::get();
do_action('updated_option', 'bricks_global_classes');
check(! SourceRevision::matches($epoch), 'Shared option change did not invalidate build.');
$epoch = SourceRevision::get();
foreach (['_transient_example', '_site_transient_example', 'cron', 'rewrite_rules', 'windpress_scan_build_state'] as $option) { do_action('updated_option', $option); }
check(SourceRevision::matches($epoch), 'Runtime bookkeeping invalidated build.');

echo "Source indexing, deletion, replay, isolation and mutation checks passed.\n";
