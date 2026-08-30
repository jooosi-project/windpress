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
namespace WindPress\WindPress\Api\Admin;

use WindPress\WindPress\Api\AbstractApi;
use WindPress\WindPress\Api\ApiInterface;
use WindPress\WindPress\Core\Cache as CoreCache;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
class ThemeJson extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }
    public function get_prefix(): string
    {
        return 'admin/theme-json';
    }
    public function register_custom_endpoints(): void
    {
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/store', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(WP_REST_Request $wprestRequest): WP_REST_Response => $this->store($wprestRequest), 'permission_callback' => fn(WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
    }
    public function store(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        $themeJsonBlob = base64_decode($payload['data'] ?? '');
        CoreCache::save_theme_json($themeJsonBlob);
        return new WP_REST_Response(['message' => __('data stored successfully', 'windpress')]);
    }
}
