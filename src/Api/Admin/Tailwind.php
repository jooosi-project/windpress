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
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
class Tailwind extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }
    public function get_prefix(): string
    {
        return 'admin/tailwind';
    }
    public function register_custom_endpoints(): void
    {
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/index', ['methods' => WP_REST_Server::READABLE, 'callback' => fn(WP_REST_Request $wprestRequest): WP_REST_Response => $this->index($wprestRequest), 'permission_callback' => fn(WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
    }
    public function index(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $tailwind_data = ['wizard' => null];
        $tailwind_data = apply_filters('f!windpress/api/admin/tailwind:index', json_decode(wp_json_encode($tailwind_data)));
        return new WP_REST_Response(['tailwind' => $tailwind_data]);
    }
}
