<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
declare (strict_types=1);
namespace WindPress\WindPress\Api\Admin\Settings;

use WIND_PRESS;
use WindPress\WindPress\Api\AbstractApi;
use WindPress\WindPress\Api\ApiInterface;
use WindPress\WindPress\Core\Cache as CoreCache;
use WindPress\WindPress\Core\Scanner\BuildState;
use WindPress\WindPress\Core\Scanner\SourceIndex;
use WindPress\WindPress\Core\Scanner\SourceRevision;
use WindPress\WindPress\Utils\Common;
use WindPress\WindPress\Utils\Debug;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
class Cache extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }
    public function get_prefix(): string
    {
        return 'admin/settings/cache';
    }
    public function register_custom_endpoints(): void
    {
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/index', ['methods' => WP_REST_Server::READABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->index($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/store', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->store($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/providers', ['methods' => WP_REST_Server::READABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->providers($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/providers/scan', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->providers_scan($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
    }
    public function index(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $cache_path = CoreCache::get_cache_path(CoreCache::CSS_CACHE_FILE);
        clearstatcache(\true, $cache_path);
        $build_state = BuildState::get();
        $cache = ['last_generated' => null, 'last_full_build' => null, 'file_url' => null, 'file_size' => \false, 'generation' => $build_state['generation'], 'source_revision' => SourceRevision::get()];
        if (file_exists($cache_path) && is_readable($cache_path)) {
            $cache['file_url'] = CoreCache::get_cache_url(CoreCache::CSS_CACHE_FILE);
            $cache['last_generated'] = filemtime($cache_path);
            $cache['file_size'] = filesize($cache_path);
            $cache['last_full_build'] = $build_state['last_full_build'] ?? null;
        }
        return new WP_REST_Response(['cache' => $cache]);
    }
    public function store(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        if (!is_array($payload) || !isset($payload['content']) || !is_string($payload['content']) || isset($payload['expected_generation']) && !is_string($payload['expected_generation']) || isset($payload['expected_source_revision']) && !is_string($payload['expected_source_revision']) || isset($payload['sourcemap']) && !is_string($payload['sourcemap']) || isset($payload['full_build']) && !is_bool($payload['full_build']) && !is_int($payload['full_build'])) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('The cache payload is invalid.', 'windpress')], 400);
        }
        $content = base64_decode($payload['content'], \true);
        $sourcemapContent = !empty($payload['sourcemap']) ? base64_decode($payload['sourcemap'], \true) : null;
        if ($content === \false || $sourcemapContent === \false) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('The cache content is not valid base64.', 'windpress')], 400);
        }
        $lease = BuildState::acquire();
        if ($lease === null) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('Another cache build is being saved. Retry the build.', 'windpress')], 409);
        }
        try {
            if (isset($payload['expected_generation']) && !BuildState::matches($payload['expected_generation'])) {
                return new WP_REST_Response(['status' => 'KO', 'message' => __('The scan generation has changed. Restart the build.', 'windpress')], 409);
            }
            if (isset($payload['expected_source_revision']) && !SourceRevision::matches($payload['expected_source_revision'])) {
                return new WP_REST_Response(['status' => 'KO', 'message' => __('Source content changed during the scan. Restart the build.', 'windpress')], 409);
            }
            if ($sourcemapContent !== null) {
                CoreCache::save_sourcemap($sourcemapContent);
                $content .= "\n/*# sourceMappingURL=" . CoreCache::CSS_SOURCEMAP_FILE . ' */';
            } else {
                // add a comment at the top of the file
                $comment = sprintf("/*! %s v%s | %s | %s */\n", strtolower(Common::plugin_data('Name')), WIND_PRESS::VERSION, gmdate('Y-m-d H:i:s', time()), strtolower(Common::plugin_data('PluginURI')));
                $content = $comment . $content;
            }
            CoreCache::save_cache($content);
            if (!empty($payload['full_build'])) {
                BuildState::complete_full_build();
            }
            return $this->index($wprestRequest);
        } catch (\Throwable $throwable) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('Save cache error: ', 'windpress') . $throwable->getMessage()], 500);
        } finally {
            BuildState::release($lease);
        }
    }
    public function providers(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $providers = CoreCache::get_providers();
        // Add installation status to each provider
        foreach ($providers as &$provider) {
            if (isset($provider['is_installed_active']) && is_callable($provider['is_installed_active'])) {
                $provider['is_installed_active'] = $provider['is_installed_active']();
            }
        }
        return new WP_REST_Response(['providers' => $providers]);
    }
    public function providers_scan(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $stopwatch = Debug::stopwatch();
        $provider_id = $wprestRequest->get_param('provider_id');
        $metadata = $wprestRequest->get_param('metadata') ?? [];
        if (!is_string($provider_id) || !is_array($metadata) || isset($metadata['generation']) && !is_string($metadata['generation']) || isset($metadata['source_revision']) && !is_string($metadata['source_revision'])) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('The scan request is invalid.', 'windpress')], 400);
        }
        $generation = BuildState::get()['generation'];
        $source_revision = SourceRevision::get();
        if (isset($metadata['generation']) && !hash_equals($generation, $metadata['generation'])) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('The scan generation has changed. Restart the build.', 'windpress')], 409);
        }
        if (isset($metadata['source_revision']) && !hash_equals($source_revision, $metadata['source_revision'])) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('Source content changed during the scan. Restart the build.', 'windpress')], 409);
        }
        $metadata += ['next_batch' => \false];
        $provider = array_filter(CoreCache::get_providers(), static fn($provider) => $provider['id'] === $provider_id);
        if ($provider === []) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('The provider not found', 'windpress')], 404);
        }
        $provider = array_shift($provider);
        $stopwatch->start('cache-provider:' . $provider['id'], 'cache-provider-scan');
        try {
            if (array_key_exists('source_index', $metadata)) {
                if (($provider['source_index'] ?? 0) !== 1) {
                    throw new \InvalidArgumentException(__('This provider does not support source indexing.', 'windpress'));
                }
                $result = SourceIndex::scan('provider:' . $provider_id, $metadata, static function (array $page_metadata) use ($provider): array {
                    return CoreCache::fetch_contents($provider['callback'], $page_metadata);
                });
            } else {
                $result = CoreCache::fetch_contents($provider['callback'], $metadata);
            }
            if (isset($metadata['source_revision']) && !SourceRevision::matches($source_revision)) {
                throw new \RuntimeException(__('Source content changed during the scan. Restart the build.', 'windpress'), 409);
            }
        } catch (\Throwable $throwable) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('Provider error: ', 'windpress') . $throwable->getMessage()], $throwable instanceof \InvalidArgumentException ? 400 : ($throwable->getCode() === 409 ? 409 : 500));
        } finally {
            $stopwatchEvent = $stopwatch->stop('cache-provider:' . $provider['id']);
        }
        return new WP_REST_Response(['metadata' => array_merge($result['metadata'], ['provider_id' => $provider['id'], 'provider_name' => $provider['name'], 'generation' => $generation, 'source_revision' => $source_revision, 'profiling' => ['unix_timestamp' => time(), 'duration' => $stopwatchEvent->getDuration() . ' ms', 'memory' => sprintf('%.2F MiB', $stopwatchEvent->getMemory() / 1024 / 1024)], 'next_batch' => $result['metadata']['next_batch'] ?? \false, 'total_batches' => $result['metadata']['total_batches'] ?? \false]), 'contents' => $result['contents'], 'status' => 'OK']);
    }
}
