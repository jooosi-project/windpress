<?php

declare(strict_types=1);

namespace WindPress\WindPress\Utils {
    class Common
    {
        public static array $writes = [];
        public static bool $fail = false;

        public static function save_file(string $content, string $path): void
        {
            if (self::$fail) {
                throw new \RuntimeException('Disk write failed');
            }
            self::$writes[$path] = $content;
        }

        public static function plugin_data(string $key): string { return 'WindPress'; }
    }

    class Cache { public static function flush_cache_plugin(): void {} }
}

namespace {
    use WindPress\WindPress\Api\Admin\Settings\Cache;
    use WindPress\WindPress\Core\Scanner\BuildState;
    use WindPress\WindPress\Core\Scanner\SourceRevision;
    use WindPress\WindPress\Utils\Common;

    require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

    class WP_REST_Request
    {
        private array $payload;
        public function __construct(array $payload = []) { $this->payload = $payload; }
        public function get_json_params(): array { return $this->payload; }
        public function get_param(string $key) { return $this->payload[$key] ?? null; }
    }

    class WP_REST_Response
    {
        public array $data;
        public int $status;
        public function __construct(array $data, int $status = 200) { $this->data = $data; $this->status = $status; }
    }

    class ScanDatabase
    {
        public string $options = 'wp_options';
        public function delete(string $table, array $where): void
        {
            $name = $where['option_name'];
            if (serialize($GLOBALS['options'][$name] ?? null) === $where['option_value']) {
                unset($GLOBALS['options'][$name]);
                if ($GLOBALS['publish_after_release'] ?? false) {
                    $GLOBALS['publish_after_release'] = false;
                    $GLOBALS['generation_before_release'] = BuildState::get()['generation'];
                    BuildState::complete_full_build();
                }
            }
        }
    }

    function check(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new RuntimeException($message);
        }
    }

    function __(string $message, string $domain): string { return $message; }
    function wp_upload_dir(): array { return ['basedir' => '/tmp/windpress-scan-api-no-files', 'baseurl' => 'https://example.test/uploads']; }
    function wp_generate_uuid4(): string { return bin2hex(random_bytes(16)); }
    function get_option(string $name, $default = false) { return $GLOBALS['options'][$name] ?? $default; }
    function add_option(string $name, $value, string $deprecated = '', bool $autoload = false): bool
    {
        if (isset($GLOBALS['options'][$name])) { return false; }
        $GLOBALS['options'][$name] = $value;
        return true;
    }
    function update_option(string $name, $value, bool $autoload = false): bool { $GLOBALS['options'][$name] = $value; return true; }
    function wp_cache_delete(string $key, string $group): void {}
    function maybe_serialize($value): string { return serialize($value); }
    function wp_json_encode($value) { return json_encode($value); }
    function get_current_user_id(): int { return 1; }
    function get_current_blog_id(): int { return 1; }
    function get_locale(): string { return 'en_US'; }
    function get_transient(string $key) { return $GLOBALS['transients'][$key] ?? false; }
    function delete_transient(string $key): bool { unset($GLOBALS['transients'][$key]); return true; }
    function set_transient(string $key, $value, int $ttl): bool { $GLOBALS['transients'][$key] = $value; return true; }
    function do_action(string $name, ...$args): void {}
    function apply_filters(string $name, $value)
    {
        return $name === 'f!windpress/core/cache:compile.providers' ? $GLOBALS['providers'] : $value;
    }

    $GLOBALS['wpdb'] = new ScanDatabase();
    $GLOBALS['options'] = [];
    $GLOBALS['providers'] = [[
        'id' => 'fixture',
        'name' => 'Fixture',
        'enabled' => true,
        'callback' => static function (array $metadata): array {
            check($metadata['next_batch'] === false, 'Missing initial page must be normalized.');
            return ['contents' => [['content' => '<div class="font-[café]">✓</div>']], 'metadata' => ['scanned_files' => 1]];
        },
    ]];

    $api = new Cache();
    $initial = $api->index(new WP_REST_Request())->data['cache']['generation'];
    check($initial === BuildState::get()['generation'], 'Generation must persist between calls.');
    $scan = $api->providers_scan(new WP_REST_Request(['provider_id' => 'fixture', 'metadata' => ['generation' => $initial]]));
    check($scan->status === 200 && $scan->data['metadata']['generation'] === $initial, 'Generation missing from scan.');
    check($scan->data['metadata']['scanned_files'] === 1, 'Provider metadata was lost.');
    check(base64_decode($scan->data['contents'][0]['content']) === '<div class="font-[café]">✓</div>', 'Backend transport lost Unicode.');

    $GLOBALS['providers'][] = [
        'id' => 'indexed', 'name' => 'Indexed', 'enabled' => true, 'source_index' => 1,
        'callback' => static function (): array {
            if ($GLOBALS['mutate_during_scan'] ?? false) { SourceRevision::invalidate(); }
            return ['contents' => [['source_id' => 'post:42', 'content' => 'text-blue-500']], 'metadata' => []];
        },
    ];
    $source_revision = SourceRevision::get();
    $metadata = ['generation' => $initial, 'source_revision' => $source_revision, 'source_index' => ['version' => 1, 'baseline' => null]];
    $indexed = $api->providers_scan(new WP_REST_Request(['provider_id' => 'indexed', 'metadata' => $metadata]));
    check($indexed->status === 200 && count($indexed->data['contents']) === 1, 'Indexed provider did not return initial snapshot.');
    $metadata['source_index']['baseline'] = $indexed->data['metadata']['source_index']['revision'];
    $indexed = $api->providers_scan(new WP_REST_Request(['provider_id' => 'indexed', 'metadata' => $metadata]));
    check($indexed->status === 200 && $indexed->data['contents'] === [], 'Indexed provider retransmitted warm bodies.');
    check($api->providers_scan(new WP_REST_Request(['provider_id' => 'fixture', 'metadata' => $metadata]))->status === 400, 'Legacy provider silently accepted indexed protocol.');
    $GLOBALS['mutate_during_scan'] = true;
    check($api->providers_scan(new WP_REST_Request(['provider_id' => 'indexed', 'metadata' => $metadata]))->status === 409, 'Scan accepted a content mutation during rendering.');
    $GLOBALS['mutate_during_scan'] = false;
    $writes = Common::$writes;
    check($api->store(new WP_REST_Request(['content' => base64_encode('stale'), 'expected_source_revision' => $source_revision]))->status === 409 && Common::$writes === $writes, 'Source mutation allowed stale CSS publication.');
    check($api->providers_scan(new WP_REST_Request(['provider_id' => 'indexed', 'metadata' => $metadata]))->status === 409, 'Scan accepted a stale source revision.');

    $registered_providers = $GLOBALS['providers'];
    $gutenberg = (new ReflectionClass(\WindPress\WindPress\Integration\Gutenberg\Main::class))->newInstanceWithoutConstructor();
    $GLOBALS['providers'] = $gutenberg->register_provider([]);
    check($api->providers(new WP_REST_Request())->data['providers'][0]['source_index'] === 1, 'Built-in registration did not advertise its indexing capability.');
    $GLOBALS['options'][WIND_PRESS::WP_OPTION . '_options'] = '{"integration":{"gutenberg":{"compile":{"enabled":false}}}}';
    $GLOBALS['providers'] = $gutenberg->register_provider([]);
    $disabled = $api->providers_scan(new WP_REST_Request([
        'provider_id' => 'gutenberg',
        'metadata' => ['source_index' => ['version' => 1, 'baseline' => null]],
    ]));
    check($disabled->status === 200 && $disabled->data['contents'] === [] && is_string($disabled->data['metadata']['source_index']['revision']), 'Disabled compile callback could not produce a completed empty indexed snapshot.');
    unset($GLOBALS['options'][WIND_PRESS::WP_OPTION . '_options']);
    $GLOBALS['providers'] = $registered_providers;

    foreach ([['provider_id' => []], ['provider_id' => 'fixture', 'metadata' => 'invalid']] as $request) {
        check($api->providers_scan(new WP_REST_Request($request))->status === 400, 'Malformed scan request was accepted.');
    }
    check($api->providers_scan(new WP_REST_Request(['provider_id' => 'missing']))->status === 404, 'Unknown provider did not return 404.');
    check($api->store(new WP_REST_Request(['content' => 'invalid!']))->status === 400, 'Malformed base64 was accepted.');
    check($api->store(new WP_REST_Request(['content' => '', 'full_build' => 'false']))->status === 400, 'Malformed build flag was accepted.');

    $lease = BuildState::acquire();
    check(is_string($lease) && BuildState::acquire() === null, 'Concurrent publication acquired the same lease.');
    check($api->store(new WP_REST_Request(['content' => base64_encode('css')]))->status === 409, 'Concurrent publication was allowed.');
    BuildState::release('wrong-owner');
    check(BuildState::acquire() === null, 'A different owner released the lease.');
    BuildState::release($lease);

    $GLOBALS['publish_after_release'] = true;
    $save = $api->store(new WP_REST_Request(['content' => base64_encode('.first{}'), 'expected_generation' => $initial, 'full_build' => 123]));
    check($save->status === 200, 'Full build publication failed.');
    $next = $save->data['cache']['generation'];
    check($next !== $initial, 'Full publication did not rotate the generation.');
    check($next === $GLOBALS['generation_before_release'] && ! BuildState::matches($next), 'Publication response captured another build generation after releasing its lease.');
    $next = BuildState::get()['generation'];
    check(BuildState::get()['last_full_build'] > 123, 'Build time must be supplied by the server.');
    $writes = Common::$writes;
    $stale = $api->store(new WP_REST_Request(['content' => base64_encode('.stale{}'), 'expected_generation' => $initial]));
    check($stale->status === 409 && Common::$writes === $writes, 'Stale publication replaced the cache.');
    check($api->providers_scan(new WP_REST_Request(['provider_id' => 'fixture', 'metadata' => ['generation' => $initial]]))->status === 409, 'Stale scan was accepted.');

    Common::$fail = true;
    $failed = $api->store(new WP_REST_Request(['content' => base64_encode('.failed{}'), 'expected_generation' => $next, 'full_build' => true]));
    check($failed->status === 500 && BuildState::matches($next), 'Failed publication changed the generation.');
    $lease = BuildState::acquire();
    check(is_string($lease), 'Failed publication leaked its lease.');
    BuildState::release($lease);

    $GLOBALS['providers'][0]['callback'] = static function (): array { throw new RuntimeException('Fixture could not render post #42'); };
    $failed = $api->providers_scan(new WP_REST_Request(['provider_id' => 'fixture']));
    check($failed->status === 500 && strpos($failed->data['message'], '#42') !== false, 'Rendering failure lost its source context.');
    $GLOBALS['providers'][0]['callback'] = static fn (): array => [['content' => null]];
    check($api->providers_scan(new WP_REST_Request(['provider_id' => 'fixture']))->status === 500, 'Invalid source content was silently accepted.');

    $GLOBALS['options']['windpress_scan_lock_' . hash('sha256', 'cache-publication')] = ['token' => 'expired', 'expires' => time() - 1];
    $lease = BuildState::acquire();
    check(is_string($lease), 'Expired publication lease could not be recovered.');
    BuildState::release($lease);

    echo "Cache API and publication generation checks passed.\n";
}
