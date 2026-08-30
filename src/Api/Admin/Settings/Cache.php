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
        $cache = ['last_generated' => null, 'last_full_build' => null, 'file_url' => null, 'file_size' => \false];
        if (file_exists($cache_path) && is_readable($cache_path)) {
            $cache['file_url'] = CoreCache::get_cache_url(CoreCache::CSS_CACHE_FILE);
            $cache['last_generated'] = filemtime($cache_path);
            $cache['file_size'] = filesize($cache_path);
            $last_full_build = wp_cache_get('last_full_build', 'windpress', \true);
            if ($last_full_build) {
                $cache['last_full_build'] = $last_full_build;
            }
        }
        return new WP_REST_Response(['cache' => $cache]);
    }
    public function store(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        try {
            $content = base64_decode($payload['content']);
            if (isset($payload['sourcemap']) && $payload['sourcemap']) {
                $sourcemapContent = base64_decode($payload['sourcemap']);
                CoreCache::save_sourcemap($sourcemapContent);
                $content .= "\n/*# sourceMappingURL=" . CoreCache::CSS_SOURCEMAP_FILE . " */";
            } else {
                // add a comment at the top of the file
                $comment = sprintf("/*! %s v%s | %s | %s */\n", strtolower(Common::plugin_data('Name')), WIND_PRESS::VERSION, gmdate('Y-m-d H:i:s', time()), strtolower(Common::plugin_data('PluginURI')));
                $content = $comment . $content;
            }
            CoreCache::save_cache($content);
        } catch (\Throwable $throwable) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('Save cache error: ', 'windpress') . $throwable->getMessage()], 500);
        }
        if (isset($payload['full_build']) && $payload['full_build']) {
            wp_cache_set('last_full_build', $payload['full_build'], 'windpress');
        }
        return $this->index($wprestRequest);
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
        $provider = array_filter(CoreCache::get_providers(), static fn($provider) => $provider['id'] === $provider_id);
        if ($provider === []) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('The provider not found', 'windpress')], 404);
        }
        $provider = array_shift($provider);
        $stopwatch->start('cache-provider:' . $provider['id'], 'cache-provider-scan');
        try {
            $result = CoreCache::fetch_contents($provider['callback'], $metadata);
        } catch (\Throwable $throwable) {
            return new WP_REST_Response(['status' => 'KO', 'message' => __('Provider error: ', 'windpress') . $throwable->__toString()], 500);
        }
        $stopwatchEvent = $stopwatch->stop('cache-provider:' . $provider['id']);
        return new WP_REST_Response(['metadata' => ['provider_id' => $provider['id'], 'provider_name' => $provider['name'], 'profiling' => ['unix_timestamp' => time(), 'duration' => $stopwatchEvent->getDuration() . ' ms', 'memory' => sprintf('%.2F MiB', $stopwatchEvent->getMemory() / 1024 / 1024)], 'next_batch' => $result['metadata']['next_batch'] ?? \false, 'total_batches' => $result['metadata']['total_batches'] ?? \false], 'contents' => $result['contents'], 'status' => 'OK']);
    }
}
